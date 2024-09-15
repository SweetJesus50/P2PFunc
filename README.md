# P2P

### P2P Smart Contracts

Allow you to rent something to someone, 
provided that an agreement or other legal document 
is signed in advance between the lessor and the renter.

Contracts support TON & Jetton logic and can be deployed via [`factory.fc`](https://github.com/SweetJesus50/P2PFunc/blob/master/contracts/p2p_factory.fc) contract or as single contract.

**⚠️ A friendly reminder: always remember, that these smart contracts do not exclude the human factor problems, but correctly manage all funds depending on situation and resolve basic troubles that may occur during rent process. If those smart contracts are deployed wrong, I am not responsible for their correct operation.**

- Contracts are specially designed to match [TEP-85](https://github.com/ton-blockchain/TEPs/blob/master/text/0085-sbt-standard.md).
- It is highly recommended to watch the [tests](https://github.com/SweetJesus50/P2PFunc/tree/master/tests) for a better understanding of the logic of the smart contracts.
  

**ⓘ Any additional information about smart contracts is available in [`.fc`](https://github.com/SweetJesus50/P2PFunc/tree/master/contracts) files.**

## Project structure

-   `contracts` - source code of all the smart contracts of the project and their dependencies.
-   `wrappers` - wrapper classes (implementing `Contract` from ton-core) for the contracts, including any [de]serialization primitives and compilation functions.
-   `tests` - tests for the contracts.
-   `scripts` - scripts used by the project, mainly the deployment scripts.

## How to use

### Build

`npx blueprint build` or `yarn blueprint build`

### Test

`npx blueprint test` or `yarn blueprint test`

### Deploy or run another script

`npx blueprint run` or `yarn blueprint run`

### Add a new contract

`npx blueprint create ContractName` or `yarn blueprint create ContractName`
