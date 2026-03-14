# Déployer USDT Smart Contract sur BSC Testnet

## 📋 Étapes

### 1️⃣ Aller sur BSC Testnet Explorer
- URL: https://testnet.bscscan.com/

### 2️⃣ Préparer le contrat SOLIDITY
- Copier tout le code de `USDT_SmartContract.sol`

### 3️⃣ Utiliser Remix IDE (facile sans outils locaux)
1. Va sur https://remix.ethereum.org/
2. Crée un nouvelle file: `USDT.sol`
3. Colle le code du contrat
4. Compiler (left panel → Compiler → version 0.8.0+)

### 4️⃣ Connecter MetaMask à BSC Testnet
Dans MetaMask:
```
Network Name: BSC Testnet
RPC URL: https://data-seed-prebsc-1-e.binance.org:8545
Chain ID: 97
Currency: tBNB
Block Explorer: https://testnet.bscscan.com
```

⚠️ Obtenir du tBNB test: https://testnet.binance.org/faucet-smart

### 5️⃣ Déployer depuis Remix
1. Left panel → "Deploy & Run Transactions"
2. Environment: "Injected Web3" (MetaMask)
3. Contract: "USDT"
4. Click "Deploy"
5. Approuve la transaction dans MetaMask

### 6️⃣ Copier l'adresse du contrat
- Une fois déployé, copier l'adresse du contrat (0x...)
- **GARDER CETTE ADRESSE**, elle sera utilisée dans l'app

### 7️⃣ Tester depuis Remix
- Clique sur le contrat déployé
- Test la fonction `faucet()` pour t'envoyer 1000 USDT de test
- Vérifiez `balanceOf(your_address)` → doit montrer 1000000000 (en unités brutes)

---

## 📝 Exemple d'adresse déployée:
```
Contract Address: 0x... (à remplir après déploiement)
Network: BSC Testnet (Chain ID: 97)
Decimals: 6
```

---

## ✅ Après déploiement:
1. Copier l'adresse du contrat
2. Dans l'app, ajouter: `const USDT_CONTRACT = '0x...'`
3. Mettre à jour `blockchain.ts` pour supporter USDT
4. Ajouter polling USDT dans WalletContext
