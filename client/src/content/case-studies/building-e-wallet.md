# Building a Reliable E-Wallet System: Handling Consistency and Concurrency

## Overview

In this project, I designed and implemented a backend system for a digital wallet with a primary focus on **data consistency**, **concurrency handling**, and **system reliability**.

Financial systems require strong guarantees — incorrect balances or duplicated transactions are unacceptable. This project explores how to design a system that prevents those issues while remaining scalable.

---

## Problem

Design a system that allows users to:

* Deposit funds
* Withdraw funds
* Transfer money to other users

### Key Challenges

* Prevent **double spending**
* Handle **concurrent transactions**
* Ensure **data consistency**
* Maintain **auditability of transactions**

---

## High-Level Design

The system is designed around a **transactional model** using a relational database.

### Core Components

* **User Service** — manages user data
* **Wallet Service** — manages balances
* **Ledger System** — tracks all financial transactions
* **Transaction Handler** — processes requests safely

---

## Data Model

### Wallet

* `id`
* `user_id`
* `balance` (cached value)

### Ledger (Source of Truth)

* `id`
* `wallet_id`
* `type` (debit / credit)
* `amount`
* `reference_id`
* `created_at`

### Transactions

* `id` (request_id)
* `user_id`
* `type`
* `status` (pending, success, failed)
* `amount`
* `created_at`

---

## Key Design Decisions

### 1. Ledger as Source of Truth

Instead of relying solely on the wallet balance, all transactions are recorded in a **ledger system**.

> Balance is derived — not the source of truth.

This ensures:

* Full auditability
* Easier debugging
* Safer financial tracking

---

### 2. Strong Consistency with ACID Transactions

All financial operations are executed within a **database transaction**.

```sql
BEGIN;

SELECT * FROM wallets WHERE id = ? FOR UPDATE;

-- validate balance

INSERT INTO ledger (...); -- debit
INSERT INTO ledger (...); -- credit

UPDATE wallets SET balance = balance - ? WHERE id = ?;
UPDATE wallets SET balance = balance + ? WHERE id = ?;

COMMIT;
```

This guarantees:

* Atomicity
* Consistency
* No partial updates

---

### 3. Concurrency Control (Preventing Race Conditions)

To prevent multiple transactions from modifying the same balance simultaneously:

* Use **row-level locking (`FOR UPDATE`)**
* Process transactions **sequentially per wallet**

This eliminates:

* Double spending
* Inconsistent balances

---

### 4. Idempotency Handling

Each request includes a **unique request ID**.

If the same request is sent multiple times:

* The system returns the previous result
* No duplicate transaction is created

This is critical for:

* Network retries
* User double-click scenarios

---

### 5. Failure Handling

If any step fails:

* The transaction is **rolled back**
* No partial state is saved

> Either the entire transaction succeeds, or nothing happens.

---

## Trade-offs

### Monolith vs Microservices

I chose a **monolithic approach with a single database** for this system.

#### Why:

* Strong consistency is easier to guarantee
* Simpler transaction management

#### Trade-off:

* Harder to scale compared to distributed systems

---

### Scaling Considerations

As the system grows:

* **Read scaling** → use read replicas
* **Write scaling** → consider sharding (e.g., by user_id)
* **Async processing** → introduce message queues (Kafka/RabbitMQ)

---

## What I Would Improve

If evolving this system further:

* Introduce **event-driven architecture** for async workflows
* Add **distributed tracing** for observability
* Implement **rate limiting and fraud detection mechanisms**
* Explore **event sourcing for financial audit systems**

---

## Conclusion

This project highlights the importance of prioritizing **correctness over complexity** in financial systems.

Rather than jumping into distributed architectures early, I focused on:

* Strong consistency
* Safe concurrency handling
* Clear system guarantees

> In financial systems, being correct is more important than being fast.

---

## Final Thoughts

Designing this system helped me better understand:

* Real-world concurrency problems
* Trade-offs between simplicity and scalability
* The importance of designing for failure

---

> Type `:q` to exit (but consistency stays).
