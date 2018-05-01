## Tiny Block Chain Example

## Example

```js
import Mhr from "menhera";
import { BlockChain, Transaction, SmartContract, MinBlock } from "../src";

Mhr.$use({
  _mount: {
    BlockChain: BlockChain({ miningReward: 1, difficulty: 2 })
  }
}).$use({
  chain: {
    genesis: new Transaction({
      timestamp: Date.now(),
      payerAddr: "mint",
      payeeAddr: "genesis",
      amount: 0
    }),
    createSCs: [
      new SmartContract({
        contractAmount: 10,
        payerAddr: "mint",
        payeeAddr: "wallet-1",
        maturityDate: new Date(Date.now())
      })
    ],
    createTxns: [
      new Transaction({
        timestamp: Date.now(),
        payerAddr: "mint",
        payeeAddr: "wallet-0",
        amount: 10
      })
    ]
  }
});

setTimeout(() => {
  Mhr.$use({
    chain: {
      minBlock: new MinBlock({
        minerAddress: "mint",
        txns: [
          new Transaction({
            payerAddr: "mint",
            payeeAddr: "wallet-0",
            amount: 10
          })
        ]
      })
    }
  });
}, 2000);

setTimeout(() => {
  console.log("mint:", Mhr.BlockChain.getAddressBalance("mint"));

  console.log("wallet-0:", Mhr.BlockChain.getAddressBalance("wallet-0"));

  console.log("wallet-1:", Mhr.BlockChain.getAddressBalance("wallet-1"));
}, 3000);
```
