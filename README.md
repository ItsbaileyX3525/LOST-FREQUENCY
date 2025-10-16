# LOST FREQUENCY

## Overview

Lost Frequency is a little web-based game that uses your unique identifier to provide you with a little section of code that is scrambled that you have to decode and send to the server and all other clients to decipher the hidden message.

This obviously means that it requires multiple people to complete the final message so let's hope that everyone that plays this can submit their decoded message and figure it out!

## How to beat

Beating this game is very simple, when you load on, just get your hash, read your hint and then decode your cipher into the correct one and submit it to the server.

Once you submit your hash, the website should reload and if it's correct you will see your contribution added to the final hash.

When the entire final hash has been revealed, you need to find the decryption key hidden somewhere on the site (very easy to find) and then use Fernet python decrpytion (or upload to server unsure of which to do rn)

once done, read the message that everyone worked towards!

## Database layout

The database follows a very simple layout, you can look at this lovely diagram typed by chatGPT about how it works:

### user_hashes

| Column        | Type         | Constraints                  |
|---------------|-------------|-------------------------------|
| id            | INTEGER     | PRIMARY KEY AUTOINCREMENT    |
| fingerprint   | TEXT        | NOT NULL, UNIQUE             |
| allocatedHash | TEXT        | NOT NULL                     |
| created_at    | DATETIME    | DEFAULT CURRENT_TIMESTAMP    |

**Indexes:**

- `idx_fingerprint` → `fingerprint`  
- `idx_allocated_hash` → `allocatedHash`  

### hashes

| Column          | Type     | Constraints                  |
|-----------------|---------|-------------------------------|
| id              | INTEGER | PRIMARY KEY AUTOINCREMENT    |
| hash            | TEXT    | NOT NULL, UNIQUE             |
| completedHash   | TEXT    | NOT NULL                     |
| related_encoded | TEXT    | NOT NULL                     |
| shortened       | TEXT    |                               |
| encryption_type | TEXT    | NOT NULL                     |

### encoded_hashes

| Column       | Type    | Constraints                  |
|--------------|--------|-------------------------------|
| id           | INTEGER | PRIMARY KEY AUTOINCREMENT    |
| part_name    | TEXT    | NOT NULL, UNIQUE             |
| encoded_value| TEXT    | NOT NULL                     |

**Indexes:**  

- `idx_part_name` → `part_name`  

### Relationships

```text
user_hashes.allocatedHash ──┐
                            └──> hashes.hash
encoded_hashes.part_name ─────> hashes.related_encoded
```

but yea that's how the database looks visually, you can also check out schema.sql to get a feel for what the database actually is!

## Other info

Just in case you are curious this server uses:

- NodeJS + ws + express
- Vite + Typescript
- tailwindcss and raw css at this point

I think this is going to be the coolest project that I have ever made in my coding existance!

### What is the fingerprint?

The fingerprint system works by using your GPU to render some items using webgl so that I can create a unique fingerprint about you, this means only you get one piece of the puzzle and can't get muliple pieces of the puzzle.

Because it is highly illegal to get a fingerprint without consent, I HAVE to put a consent thing before you I render your print >:(