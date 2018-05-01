import sha256 from "crypto-js/sha256";
import { $set } from "menhera";
import { EventEmitter } from "events";

export const MinBlock = ({ minerAddress = "", txns = [] }) => ({
  minerAddress,
  txns
});

export const Block = ({
  timestamp = "",
  txns = [],
  previousHash = "",
  hash = "",
  nonce = 0
}) => ({
  timestamp,
  txns, // Transactions
  previousHash,
  hash,
  nonce
});

export const Transaction = ({
  timestamp = "",
  payerAddr = "",
  payeeAddr = "",
  amount = 0,
  smartContract = null
}) => ({
  timestamp,
  payerAddr,
  payeeAddr,
  amount,
  smartContract
});

export const SmartContract = ({
  contractAddr = "",
  contractAmount = 0,
  payerAddr = "",
  payeeAddr = "",
  maturityDate = new Date()
}) => ({
  contractAddr,
  contractAmount,
  payerAddr,
  payeeAddr,
  maturityDate
});

export const BlockChain = data => ({
  _hooks: {
    data: {
      $({ _key, _val, cp }) {
        cp[_key] = _val;
      }
    },
    methods: {
      $({ _key, _val, cp }) {
        cp[_key] = _val.bind(cp);
      }
    },
    chain: {
      genesis({ _val: txn }) {
        let block = this.genBlock({ txns: [txn] });
        this.chain.push(block);
      },
      minBlock({ _val }) {
        _val.processSmartContract = true;
        this.minCurrentBlock({ _val });
      },
      createTxns: {
        A$({ _val: txn }) {
          let val = {
            txn,
            processSmartContract: true
          };
          this.receiveTransaction(val);
        }
      },
      createSCs: {
        A$({ _val: sc }) {
          console.log(`New Smart Contract: ${JSON.stringify(sc)}}`);
          const { payerAddr, contractAddr, contractAmount } = sc;

          sc.contractAddr = `smartContract${(
            Math.random() * Date.now()
          ).toString()}`;

          let txn = new Transaction({
            timestamp: Date.now(),
            payerAddr,
            payeeAddr: contractAddr,
            amount: contractAmount,
            smartContract: sc
          });
          let val = {
            txn,
            processSmartContract: false
          };

          this.receiveTransaction(val);
        }
      },
      on: {
        $({ _key, _val: cb }) {
          this.Event.on(_key, _val => cb({ _val }));
        }
      }
    }
  },
  data: {
    name: "BlockChain",
    chain: [],
    difficulty: 3,
    miningReward: 50,
    Event: new EventEmitter()
  },
  methods: {
    calculateHash(_val) {
      const { timestamp, txns, previousHash, nonce } = _val;
      const hash = sha256(
        previousHash + timestamp + JSON.stringify(txns) + nonce
      ).toString();

      return hash;
    },
    getLatestBlock() {
      return this.chain[this.chain.length - 1] || {};
    },
    genBlock({ timestamp = Date.now(), txns }) {
      let block = new Block({ timestamp, txns });

      $set(block, {
        previousHash: this.getLatestBlock().hash,
        hash: this.calculateHash(block)
      });
      return block;
    },
    isChainValid() {
      for (let i = 1; i < this.chain.length; i++) {
        const cBlock = this.chain[i];
        const pBlock = this.chain[i - 1];
      }
      if (cBlock.hash !== this.calculateHash(cBlock)) return false;
      if (cBlock.previousHash !== pBlock.hash) return false;

      return true;
    },
    async minBlock(block) {
      const { difficulty } = this;

      while (
        block.hash.substring(0, difficulty) != Array(difficulty + 1).join("0")
      ) {
        block.nonce++;
        block.hash = this.calculateHash(block);
      }
      console.log(
        `Block successfully hashed (${block.nonce} iterations)  Hash:${
          block.hash
        }`
      );
      return block;
    },
    getAddressBalance(addr) {
      let balance = 0;
      for (const block of this.chain) {
        for (const txn of block.txns) {
          if (txn.payerAddr === addr) {
            balance -= txn.amount;
          }
          if (txn.payeeAddr === addr) {
            balance += txn.amount;
          }
        }
      }
      return balance;
    },
    async minCurrentBlock({ _val }) {
      const {
        timestamp = Date.now(),
        txns,
        minerAddress,
        processSmartContract = false
      } = _val;
      const { miningReward } = this;

      if (processSmartContract) {
        this.iterateSmartContracts();
      }

      let validatedTxns = [];
      for (const txn of txns) {
        if (
          txn.payerAddr === "mint" ||
          txn.payerAddr.startsWith("smartContract") ||
          this.validateTransaction(txn)
        ) {
          validatedTxns.push(txn);
        }
      }

      validatedTxns.push(
        new Transaction({
          timestamp,
          payerAddr: "mint",
          payeeAddr: minerAddress,
          amount: miningReward
        })
      );

      let block = this.genBlock({ txns: validatedTxns });

      await this.minBlock(block);

      return this.chain.push(block);
    },
    validateTransaction(txn) {
      let payerAddr = txn.payerAddr;
      let balance = this.getAddressBalance(payerAddr);
      if (balance >= txn.amount) {
        return true;
      } else {
        return false;
      }
    },
    receiveTransaction(_val) {
      const { txn, processSmartContract } = _val;
      console.log(
        `Txn received by blockchain, From ${txn.payerAddr} to ${
          txn.payeeAddr
        } Amount ${txn.amount}`
      );

      this.minCurrentBlock({
        _val: {
          minerAddress: "mint",
          txns: [txn],
          processSmartContract
        }
      });
    },
    processSmartContract(txn) {
      let now = new Date();
      const {
        smartContract: { maturityDate, contractAddr, payeeAddr, contractAmount }
      } = txn;
      if (now.getTime() >= maturityDate.getTime()) {
        let payoutTnx = new Transaction({
          timestamp: Date.now(),
          payerAddr: contractAddr,
          payeeAddr,
          amount: contractAmount
        });
        this.receiveTransaction({
          txn: payoutTnx,
          processSmartContract: false
        });
        console.log(
          `Smart Contract: matured, from ${payoutTnx.payerAddr} to ${
            payoutTnx.payeeAddr
          } payed out: ${payoutTnx.amount}`
        );
      }
    },
    iterateSmartContracts() {
      for (const block of this.chain) {
        for (const txn of block.txns) {
          if (txn.smartContract !== null && this.hasOpenContract(txn)) {
            this.processSmartContract(txn);
          }
        }
      }
    },
    hasOpenContract(txn2Check) {
      for (const block of this.chain) {
        for (const txn of block.txns) {
          if (txn.payerAddr === txn2Check.smartContract.contractAddr) {
            return false;
          }
        }
      }
      return true;
    }
  }
});
