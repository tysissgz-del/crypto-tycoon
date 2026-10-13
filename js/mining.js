/**
 * Bitcoin Mining & Halving Hardware Engine
 */

export class MiningEngine {
    constructor() {
        this.totalHashrate = 0; // TH/s
        this.minedBTC = 0.00000000;
        this.manualClickPower = 1; // sats per click base
        this.clicksCount = 0;
        
        // Halving & Block parameters
        this.blockHeight = 840000;
        this.blockReward = 3.125; // BTC per block
        this.blocksUntilHalving = 210;
        this.minedBlocks = 0;
        this.halvingCount = 0;

        // Power & Electricity
        this.powerConsumptionKW = 0; // kW
        this.electricityCostPerKWh = 0.12; // $0.12 per kWh
        this.unpaidElectricBill = 0;
        this.powerEfficiencyLevel = 0; // Upgrade reduces bill

        // Auto-Clicker System
        this.autoClickActive = false;
        this.autoClickLevel = 0;
        this.autoClickCPS = 0; // Clicks per second
        this.autoClickUpgrades = [
            { level: 1, name: 'AI 오토클릭 매크로 봇', cps: 1, price: 300, icon: '🤖', desc: '초당 1회 자동 클릭' },
            { level: 2, name: '초고속 멀티스레드 클릭봇', cps: 5, price: 2500, icon: '⚡', desc: '초당 5회 자동 클릭' },
            { level: 3, name: '터보 퀀텀 오토클리커', cps: 20, price: 18000, icon: '⚛️', desc: '초당 20회 자동 클릭' },
            { level: 4, name: '초광속 뉴럴 클릭 드라이브', cps: 50, price: 120000, icon: '🛸', desc: '초당 50회 자동 클릭' }
        ];

        // Mining Hardware Catalog
        this.rigs = [
            { id: 'cpu', name: 'CPU 마이너 (Intel i7)', count: 0, basePrice: 50, hashrate: 0.00005, powerKW: 0.15, icon: '💻' },
            { id: 'gpu', name: 'GPU 채굴기 (RTX 4090)', count: 0, basePrice: 1200, hashrate: 0.002, powerKW: 0.45, icon: '🖥️' },
            { id: 'asic', name: 'ASIC 비트코인 채굴기 (S21)', count: 0, basePrice: 8500, hashrate: 0.15, powerKW: 3.2, icon: '⚡' },
            { id: 'hydro', name: '수랭식 컨테이너 채굴장', count: 0, basePrice: 75000, hashrate: 2.5, powerKW: 45.0, icon: '🏢' },
            { id: 'quantum', name: '양자 슈퍼컴퓨터 채굴기', count: 0, basePrice: 1200000, hashrate: 60.0, powerKW: 800.0, icon: '⚛️' },
            { id: 'satellite', name: '우주 궤도 태양광 위성 채굴기', count: 0, basePrice: 35000000, hashrate: 2500.0, powerKW: 0.0, icon: '🛰️' }
        ];
    }

    calculateTotalHashrate() {
        let total = 0;
        let totalPower = 0;

        this.rigs.forEach(r => {
            total += r.count * r.hashrate;
            totalPower += r.count * r.powerKW;
        });

        this.totalHashrate = total;
        // Discount power cost by green energy efficiency upgrade
        const discount = Math.pow(0.85, this.powerEfficiencyLevel);
        this.powerConsumptionKW = totalPower * discount;

        return this.totalHashrate;
    }

    manualMine(multiplier = 1) {
        this.clicksCount++;
        // 1 BTC = 100,000,000 satoshis
        const satsEarned = (this.manualClickPower * multiplier) / 100000000;
        this.minedBTC += satsEarned;
        return satsEarned;
    }

    tickMining(seconds = 1) {
        this.calculateTotalHashrate();

        if (this.totalHashrate <= 0) return { btcEarned: 0, blockMined: false };

        // Hashrate to BTC conversion factor (simulated difficulty balance)
        const btcEarnedPerSec = (this.totalHashrate * 0.00000015 * (this.blockReward / 3.125));
        const actualEarned = btcEarnedPerSec * seconds;
        this.minedBTC += actualEarned;

        // Accumulate electricity bill ($ per sec) including Auto-Clicker power
        let autoPowerKW = 0;
        if (this.autoClickActive && this.autoClickCPS > 0) {
            autoPowerKW = this.autoClickCPS * 0.8; // 0.8 kW per CPS
        }

        const totalActivePower = this.powerConsumptionKW + autoPowerKW;
        const electricCostThisTick = totalActivePower * (seconds / 3600) * this.electricityCostPerKWh;
        this.unpaidElectricBill += electricCostThisTick;

        // Block Progress Check
        let blockMined = false;
        if (Math.random() < Math.min(0.8, this.totalHashrate * 0.1)) {
            this.blockHeight++;
            this.minedBlocks++;
            this.blocksUntilHalving--;
            blockMined = true;

            // Halving Check
            if (this.blocksUntilHalving <= 0) {
                this.halvingCount++;
                this.blockReward /= 2;
                this.blocksUntilHalving = 210;
            }
        }

        return {
            btcEarned: actualEarned,
            blockMined: blockMined
        };
    }

    getRigPrice(rig) {
        return Math.floor(rig.basePrice * Math.pow(1.15, rig.count));
    }

    buyRig(rigId, playerCash) {
        const rig = this.rigs.find(r => r.id === rigId);
        if (!rig) return { success: false, reason: 'Invalid rig' };

        const price = this.getRigPrice(rig);
        if (playerCash < price) {
            return { success: false, reason: '잔액이 부족합니다.' };
        }

        rig.count++;
        this.calculateTotalHashrate();
        return { success: true, price };
    }

    upgradeAutoClicker(playerCash) {
        if (this.autoClickLevel >= this.autoClickUpgrades.length) {
            return { success: false, reason: '오토클리커 최고 등급을 달성했습니다.' };
        }

        const nextUpgrade = this.autoClickUpgrades[this.autoClickLevel];
        if (playerCash < nextUpgrade.price) {
            return { success: false, reason: `구매 금액($${nextUpgrade.price.toLocaleString()})이 부족합니다.` };
        }

        this.autoClickLevel++;
        this.autoClickCPS = nextUpgrade.cps;
        this.autoClickActive = true;
        return { success: true, upgrade: nextUpgrade, price: nextUpgrade.price };
    }
}
