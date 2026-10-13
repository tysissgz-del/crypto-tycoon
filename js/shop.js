/**
 * Luxury Asset Shop & Hard Fork Prestige Engine
 */

export class ShopEngine {
    constructor() {
        this.genesisBlocks = 0; // Hard fork prestige currency
        this.prestigeCount = 0;

        this.items = [
            { id: 'coffee', name: '몬스터 에너지만 에너지 드링크', priceUSD: 5, icon: '⚡', desc: '수동 클릭 채굴 파워 +2 sat/클릭', owned: 0, clickPowerAdd: 2 },
            { id: 'ledger', name: '하드웨어 콜드월렛 (Ledger Nano S)', priceUSD: 149, icon: '🔑', desc: '수동 클릭 채굴 파워 +10 sat/클릭', owned: 0, clickPowerAdd: 10 },
            { id: 'cybertruck', name: '테슬라 사이버트럭 (풀옵션)', priceUSD: 99900, icon: '🛻', desc: '자동 채굴 효율 +10% (해시레이트 증대)', owned: 0, hashMultAdd: 0.10 },
            { id: 'solar', name: '자가발전 그린 에너지 태양광 단지', priceUSD: 250000, icon: '☀️', desc: '채굴 전력 비용 -20% 절감', owned: 0, powerSave: 1 },
            { id: 'penthouse', name: '시그니엘 최고층 펜트하우스', priceUSD: 1500000, icon: '🏙️', desc: '매초 $500 패시브 임대 수익 생성', owned: 0, passiveCash: 500 },
            { id: 'jet', name: '골프스트림 G700 전용기', priceUSD: 75000000, icon: '🛩️', desc: '매초 $25,000 패시브 엔젤투자 수익 생성', owned: 0, passiveCash: 25000 },
            { id: 'exchange', name: '글로벌 암호화폐 거래소 대주주 지분', priceUSD: 500000000, icon: '🏛️', desc: '선물/현물 거래 수수료 100% 면제 + 수수료 수익 환급', owned: 0, feeWaived: true }
        ];
    }

    buyItem(itemId, gameState) {
        const item = this.items.find(i => i.id === itemId);
        if (!item) return { success: false, reason: '아이템을 찾을 수 없습니다.' };

        const currentPrice = Math.floor(item.priceUSD * Math.pow(1.3, item.owned));
        if (gameState.cashUSD < currentPrice) {
            return { success: false, reason: '구매 자금이 부족합니다.' };
        }

        gameState.cashUSD -= currentPrice;
        item.owned++;

        // Apply item effect
        if (item.clickPowerAdd) {
            gameState.mining.manualClickPower += item.clickPowerAdd;
        }
        if (item.powerSave) {
            gameState.mining.powerEfficiencyLevel += item.powerSave;
        }

        return { success: true, item, pricePaid: currentPrice };
    }

    calculatePrestigeReward(gameState) {
        const totalValueUSD = gameState.cashUSD + (gameState.btc * gameState.market.btcPrice);
        if (totalValueUSD < 500000 && gameState.mining.minedBTC < 5) {
            return { eligible: false, required: '$500,000 총자산 또는 5 BTC 채굴 필요' };
        }

        const blocksGained = Math.floor(Math.sqrt(totalValueUSD / 50000) + (gameState.mining.minedBTC * 2));
        return { eligible: true, blocksGained };
    }

    executeHardFork(gameState) {
        const reward = this.calculatePrestigeReward(gameState);
        if (!reward.eligible) return { success: false, reason: reward.required };

        this.genesisBlocks += reward.blocksGained;
        this.prestigeCount++;

        // Reset progress but retain Genesis Blocks
        gameState.cashUSD = 10000;
        gameState.btc = 0.00000000;
        gameState.mining.rigs.forEach(r => r.count = 0);
        gameState.mining.calculateTotalHashrate();
        gameState.mining.minedBTC = 0;
        this.items.forEach(i => i.owned = 0);
        gameState.mining.manualClickPower = 1 + (this.genesisBlocks * 5);

        return { success: true, genesisBlocksGained: reward.blocksGained };
    }
}
