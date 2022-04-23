# Replicator

## Things that could be done

* Implement a merkle tree type; merkle root is stored on chain, data stored on replicator.
  * Why: then the zkApp can enforce rules on changes to the database

* Move the wrapped replicator to the cloud with socket.io
  * Why: then the replicator is actually useful for multiple nodes to interact with

* Create a Wrapped_Mina that uses GraphQL
  * Why: Then this code can actually interact with the real blockchain

* Require users to pay the replicator
  * Why: To prevent DDOS and create a payment model for the replicator

* Create the option to require signatures from N replicators instead of just 1
  * Why: To improve the trust model (then all would have to defect to break the trust model)
  * Note: On-chain would then store a hash of [replicators], and the heights in some compressed field-packed format
