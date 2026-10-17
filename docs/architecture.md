# QuickNotes Architecture

## Requirements

### Functional requirements
- Users can sign in and create, view, update and delete their own notes.
- Users can add tags to notes and filter notes by tag.
- Users can see their notes in order, newest first.

### Non-functional requirements
- **Availability:** The service should stay up if one server or one data centre component fails.
- **Performance:** Loading a list of notes should take well under one second for most users.
- **Scalability:** The system should handle 1 million users without a redesign.
- **Durability:** A saved note must not be lost after the server confirms it was saved.
- **Security:** Passwords are hashed, traffic uses HTTPS, and users can only see their own notes.

## Load estimate for 1 million users

**Assumptions**
- 1,000,000 registered users, and 20% are active each day, so 200,000 daily active users.
- Each active user reads notes 10 times a day and creates 1 note a day.
- A note takes about 2 KB of storage, including its tags and metadata.
- Peak traffic is 5 times the average.
- A day has 86,400 seconds, and a year has 365 days.

**Reads per second**
- Reads per day: 200,000 × 10 = 2,000,000
- Average: 2,000,000 ÷ 86,400 ≈ **23 reads per second**
- Peak: 23 × 5 ≈ **116 reads per second**

**Writes per second**
- Writes per day: 200,000 × 1 = 200,000
- Average: 200,000 ÷ 86,400 ≈ **2.3 writes per second**
- Peak: 2.3 × 5 ≈ **12 writes per second**

**Storage per year**
- Storage per day: 200,000 × 2 KB = 400 MB
- Storage per year: 400 MB × 365 ≈ **146 GB per year**

The system is **read-heavy**, with about 10 reads for every write. The design therefore focuses on fast reads, through a cache and a read replica.

## Architecture diagram

```
   [Client: browser or phone]
          |
          v
        [DNS] --- resolves the API name to the load balancer addresses
          |
          v
        [CDN] --- serves static files (HTML, CSS, JavaScript) from locations near users
          |
          v
   [Load balancer (two or more, with failover)]
          |
     +----+-----------------+
     |                      |
     v                      v
 [App server 1]        [App server 2]   (more servers can be added)
     |        \            /     |
     |         \          /      |
     |          v        v       |
     |        [Cache cluster]    |
     |        (recent note lists)|
     |                           |
     |   writes                  |   reads
     v                           v
 [Primary database] ------> [Read replica]
     |
     | (after each write, a message is added)
     v
 [Queue] ----------------> [Worker]
                          (search index, notifications,
                           cache clean-up, tag counts)
```

## What each component does

- **Client:** The browser or phone app that sends requests and shows the results to the user.
- **DNS:** Turns the friendly address of the API into the network addresses of the load balancers, so users never need to know the server locations.
- **CDN:** Serves the static files of the web app from locations near users, which is faster and reduces load on the main servers.
- **Load balancer:** Spreads requests across the app servers, and stops sending traffic to any server that fails its health check.
- **App servers:** Run the API logic, check the user's token, and talk to the database, cache and queue. Two or more run at once so one can fail without stopping the service.
- **Cache cluster:** Stores recently requested note lists, so most reads never reach the database.
- **Primary database:** Stores every user, note and tag, and handles all writes, so the data stays consistent.
- **Read replica:** A copy of the primary database that serves read requests, so reads do not compete with writes for the primary database's resources.
- **Queue:** Holds jobs that don't need to finish before the user gets a reply, so the write stays fast.
- **Worker:** Takes jobs from the queue and does the slower work in the background, such as updating a search index or sending notifications.

## Request flows

### GET /notes (list a user's notes)

1. The client looks up the API address through DNS.
2. The request reaches the load balancer, which forwards it to a healthy app server.
3. The app server checks the bearer token. If the token is missing or invalid, it returns 401.
4. The app server looks for the user's note list in the cache.
5. If the list is in the cache (a cache hit), the app server returns it straight away with 200 OK.
6. If it is not in the cache (a cache miss), the app server queries the read replica for the user's notes, newest first.
7. The app server stores the result in the cache for a short time, then returns it with 200 OK.

### POST /notes (create a note)

1. The client sends the new note to the API address through DNS and the load balancer.
2. The app server checks the token, then validates the title (required, up to 100 characters). If the check fails, it returns 400.
3. The app server writes the new note to the primary database.
4. The app server adds a job to the queue, such as "note 42 created".
5. The app server removes the user's cached note list, so the next read gets fresh data.
6. The app server returns 201 Created with the new note.
7. The worker takes the job from the queue and runs the slower tasks, such as updating the search index.

## Trade-offs

**Trade-off 1: Speed versus freshness with the cache.**
A cache makes reads fast and reduces database load. The cost is that a user may see a slightly old list for a short time after a change. Clearing the cache on each write reduces this, but then the cache helps less.

**Trade-off 2: Speed versus freshness with the read replica.**
Reading from a replica keeps the primary database free for writes. The cost is replication lag: a note just saved might not appear on the replica for a moment. For a notes app this is acceptable, but a user reading their own note straight after saving it should be sent to the primary database.

**Trade-off 3: Simple synchronous work versus background jobs.**
Using a queue keeps the API fast and lets slow work happen later. The cost is more moving parts, and a job can take a short time to finish, so some features are eventually consistent.

## Avoiding single points of failure

- **Load balancer:** Two or more load balancers run at once, with failover to a standby if one fails.
- **App servers:** At least two run at the same time behind the load balancer. Health checks remove any server that stops responding.
- **DNS:** Uses multiple records and a DNS provider with its own redundancy.
- **Cache cluster:** Runs as several nodes with replication, so losing one node does not empty the cache for all users.
- **Primary database:** A standby copy is kept in a second data centre zone, and it takes over automatically if the primary fails.
- **Read replica:** More than one replica is kept, so reads continue if one fails.
- **Queue and worker:** The queue stores messages on several machines, and multiple workers read from it, so one failed worker does not stop the jobs.
- **Data centres:** Servers are spread across at least two availability zones, so a power or network failure in one zone does not take down the service.
