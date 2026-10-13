/**
 * Spot & 100x Leverage Margin Trading Engine
 */

export class TradingEngine {
    constructor() {
        this.positions = []; // Array of active margin positions
        this.tradeHistory = [];
        this.maintenanceMargin = 0.005; // 0.5% maintenance margin
    }

    openPosition({ type, symbol = 'BTC', entryPrice, marginUSD, leverage }) {
        if (marginUSD <= 0) return { success: false, reason: '증거금이 올바르지 않습니다.' };

        const totalValue = marginUSD * leverage;
        const amount = totalValue / entryPrice;

        // Calculate Liquidation Price
        let liqPrice = 0;
        if (type === 'LONG') {
            liqPrice = entryPrice * (1 - (1 / leverage) + this.maintenanceMargin);
        } else {
            liqPrice = entryPrice * (1 + (1 / leverage) - this.maintenanceMargin);
        }

        const position = {
            id: 'pos_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
            symbol,
            type, // 'LONG' or 'SHORT'
            entryPrice,
            marginUSD,
            leverage,
            totalValue,
            amount,
            liqPrice,
            pnlUSD: 0,
            pnlPct: 0,
            timestamp: Date.now()
        };

        this.positions.push(position);
        return { success: true, position };
    }

    updatePositions(currentPrices) {
        const liquidations = [];

        this.positions.forEach(pos => {
            const price = currentPrices[pos.symbol] || currentPrices.BTC;
            let priceDiff = 0;

            if (pos.type === 'LONG') {
                priceDiff = price - pos.entryPrice;
            } else {
                priceDiff = pos.entryPrice - price;
            }

            pos.pnlUSD = priceDiff * pos.amount;
            pos.pnlPct = (pos.pnlUSD / pos.marginUSD) * 100;

            // Check Liquidation Condition
            let isLiquidated = false;
            if (pos.type === 'LONG' && price <= pos.liqPrice) {
                isLiquidated = true;
            } else if (pos.type === 'SHORT' && price >= pos.liqPrice) {
                isLiquidated = true;
            }

            if (isLiquidated) {
                liquidations.push({ ...pos, closePrice: price, isLiquidated: true });
            }
        });

        // Remove liquidated positions
        if (liquidations.length > 0) {
            const liqIds = new Set(liquidations.map(l => l.id));
            this.positions = this.positions.filter(p => !liqIds.has(p.id));

            liquidations.forEach(l => {
                this.tradeHistory.unshift({
                    ...l,
                    time: new Date().toLocaleTimeString('ko-KR', { hour12: false })
                });
            });
        }

        return liquidations;
    }

    closePosition(positionId, currentPrice) {
        const idx = this.positions.findIndex(p => p.id === positionId);
        if (idx === -1) return { success: false, reason: '포지션을 찾을 수 없습니다.' };

        const pos = this.positions[idx];
        let priceDiff = 0;

        if (pos.type === 'LONG') {
            priceDiff = currentPrice - pos.entryPrice;
        } else {
            priceDiff = pos.entryPrice - currentPrice;
        }

        const finalPnlUSD = priceDiff * pos.amount;
        const returnCash = Math.max(0, pos.marginUSD + finalPnlUSD);

        this.positions.splice(idx, 1);

        const closedRecord = {
            ...pos,
            closePrice: currentPrice,
            pnlUSD: finalPnlUSD,
            pnlPct: (finalPnlUSD / pos.marginUSD) * 100,
            time: new Date().toLocaleTimeString('ko-KR', { hour12: false })
        };

        this.tradeHistory.unshift(closedRecord);
        return { success: true, returnCash, pnlUSD: finalPnlUSD };
    }
}
