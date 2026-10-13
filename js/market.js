/**
 * Crypto Market & Order Book Engine
 */

export class MarketEngine {
    constructor() {
        this.btcPrice = 65000.00;
        this.btcChange24h = +2.45;
        this.prevPrice = 65000.00;
        
        // Dynamic Altcoins
        this.altcoins = {
            ETH: { name: '이더리움 (ETH)', price: 3450.00, change24h: +1.8, btcCorrelation: 0.85, volatility: 0.008, icon: 'Ξ' },
            SOL: { name: '솔라나 (SOL)', price: 145.50, change24h: +4.2, btcCorrelation: 0.75, volatility: 0.015, icon: '◎' },
            DOGE: { name: '도지코인 (DOGE)', price: 0.1420, change24h: -1.2, btcCorrelation: 0.60, volatility: 0.025, icon: 'Ð' },
            PEPE: { name: '페페 (PEPE)', price: 0.0000098, change24h: +12.5, btcCorrelation: 0.40, volatility: 0.040, icon: '🐸' }
        };

        this.candles = [];
        this.sentiment = 50; // Neutral 0~100 (Fear to Greed)
        this.newsImpactMultiplier = 0; // Temporary price pump or dump factor
        this.orderBook = { asks: [], bids: [] };
        this.recentTrades = [];

        this.initHistory();
    }

    initHistory() {
        // Pre-populate 50 historical candles for initial chart rendering
        let price = 62000.00;
        const now = Date.now() - 50 * 5000;

        for (let i = 0; i < 50; i++) {
            const changePct = (Math.random() - 0.48) * 0.008;
            const open = price;
            const close = price * (1 + changePct);
            const high = Math.max(open, close) * (1 + Math.random() * 0.003);
            const low = Math.min(open, close) * (1 - Math.random() * 0.003);
            const volume = Math.random() * 15 + 2;

            this.candles.push({
                open, high, low, close, volume,
                timestamp: now + i * 5000
            });
            price = close;
        }

        this.btcPrice = price;
        this.prevPrice = price;
        this.updateOrderBook();
    }

    setNewsImpact(pctMultiplier, durationSecs = 10, newsTitle = '') {
        this.newsImpactMultiplier = pctMultiplier;
        if (pctMultiplier > 0) {
            this.lastMarketEvent = { type: 'TTEOKSANG', title: newsTitle || '🔥 대형 호재 발생! 떡상 개시!' };
        } else if (pctMultiplier < 0) {
            this.lastMarketEvent = { type: 'NARAK', title: newsTitle || '🚨 대형 악재 터짐! 나락 폭락 시작!' };
        }
        setTimeout(() => {
            this.newsImpactMultiplier = 0;
        }, durationSecs * 1000);
    }

    tick() {
        this.prevPrice = this.btcPrice;
        this.lastMarketEvent = null;

        // Base random volatility with downwards trend capability (-1.2% to +1.0%)
        let delta = (Math.random() - 0.51) * 0.009;

        // Random Flash Crash Trigger (2% chance of sudden 5%~15% crash/나락)
        const isFlashCrash = Math.random() < 0.025;
        if (isFlashCrash) {
            const crashPct = -(Math.random() * 0.10 + 0.05); // -5% to -15%
            delta = crashPct;
            this.lastMarketEvent = {
                type: 'NARAK',
                title: `🚨 [나락 Alert] 패닉셀 폭락 발생! 비트코인 시세 ${(crashPct * 100).toFixed(1)}% 급락!`
            };
        } else if (Math.random() < 0.02) {
            // Random Moon Pump Trigger (2% chance of sudden 5%~15% pump/떡상)
            const pumpPct = +(Math.random() * 0.10 + 0.05); // +5% to +15%
            delta = pumpPct;
            this.lastMarketEvent = {
                type: 'TTEOKSANG',
                title: `🚀 [떡상 Alert] 거대 고래 매수 폭등! 비트코인 시세 +${(pumpPct * 100).toFixed(1)}% 급등!`
            };
        }

        // Sentiment bias
        const sentimentBias = (this.sentiment - 50) / 5000; // -0.01 to +0.01 bias
        delta += sentimentBias;

        // News impact
        if (this.newsImpactMultiplier !== 0) {
            delta += this.newsImpactMultiplier * 0.008;
        }

        const newPrice = Math.max(100, this.btcPrice * (1 + delta));
        this.btcPrice = newPrice;

        // 24h change mock drift
        this.btcChange24h += delta * 15;
        this.btcChange24h = Math.max(-50, Math.min(80, this.btcChange24h));

        // Update Altcoins based on BTC correlation & random drift
        Object.keys(this.altcoins).forEach(symbol => {
            const alt = this.altcoins[symbol];
            const altDelta = (delta * alt.btcCorrelation) + (Math.random() - 0.5) * alt.volatility;
            alt.price = Math.max(0.00000001, alt.price * (1 + altDelta));
            alt.change24h += altDelta * 10;
        });

        // Update Order Book & Live Trades Stream
        this.updateOrderBook();

        if (Math.random() > 0.4) {
            this.generateRandomTrade();
        }

        return {
            btcPrice: this.btcPrice,
            prevPrice: this.prevPrice,
            delta: delta,
            marketEvent: this.lastMarketEvent
        };
    }

    updateOrderBook() {
        const p = this.btcPrice;
        const asks = [];
        const bids = [];

        for (let i = 1; i <= 6; i++) {
            const askPrice = p * (1 + i * 0.0004);
            const askVol = (Math.random() * 2.5 + 0.1).toFixed(3);
            asks.unshift({ price: askPrice, volume: askVol });

            const bidPrice = p * (1 - i * 0.0004);
            const bidVol = (Math.random() * 2.5 + 0.1).toFixed(3);
            bids.push({ price: bidPrice, volume: bidVol });
        }

        this.orderBook = { asks, bids };
    }

    generateRandomTrade() {
        const isBuy = Math.random() > 0.48;
        const vol = (Math.random() * 1.8 + 0.01).toFixed(4);
        const price = this.btcPrice * (1 + (Math.random() - 0.5) * 0.0002);
        
        const wallets = ['Satoshi_99', 'CryptoWhale', 'HODL_King', 'Elon_Fan', 'Bull_Runner', 'Nakamoto_X'];
        const trader = wallets[Math.floor(Math.random() * wallets.length)];

        this.recentTrades.unshift({
            trader,
            type: isBuy ? 'BUY' : 'SELL',
            price,
            vol,
            time: new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })
        });

        if (this.recentTrades.length > 15) {
            this.recentTrades.pop();
        }
    }
}
