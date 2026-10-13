/**
 * Main Game Coordinator & UI Manager
 */

import { audio } from './audio.js';
import { CryptoChart } from './chart.js';
import { MarketEngine } from './market.js';
import { MiningEngine } from './mining.js';
import { TradingEngine } from './trading.js';
import { NewsEngine } from './news.js';
import { ShopEngine } from './shop.js';

class GameApp {
    constructor() {
        this.cashUSD = 1000.00; // Initial starter cash
        this.btc = 0.00000000;
        this.totalBtcBoughtCostUSD = 0.00;
        this.totalBtcBoughtQty = 0.00000000;
        this.altBalances = { ETH: 0, SOL: 0, DOGE: 0, PEPE: 0 };
        this.krwRate = 1380; // $1 = ₩1,380

        this.chart = null;
        this.market = new MarketEngine();
        this.mining = new MiningEngine();
        this.trading = new TradingEngine();
        this.news = new NewsEngine();
        this.shop = new ShopEngine();

        this.selectedTab = 'mining';
        this.selectedTradeSymbol = 'BTC';
        this.leverageMultiplier = 10;
        this.tradeType = 'LONG';

        this.init();
    }

    init() {
        this.loadSavedState();

        // Initialize Chart
        this.chart = new CryptoChart('cryptoChartCanvas');
        this.chart.setCandles(this.market.candles);

        this.bindEvents();
        this.setupTabNavigation();

        // Main Simulation Loops
        setInterval(() => this.tickSecond(), 1000); // 1-sec game tick
        setInterval(() => this.tickNews(), 12000);  // 12-sec news tick
        setInterval(() => this.autoSave(), 10000);  // 10-sec auto save

        this.renderAll();
    }

    bindEvents() {
        // Audio Toggle
        const audioBtn = document.getElementById('audioToggleBtn');
        if (audioBtn) {
            audioBtn.addEventListener('click', () => {
                const muted = audio.toggleMute();
                audioBtn.innerHTML = muted ? '🔇 음소거' : '🔊 사운드 ON';
                audioBtn.classList.toggle('muted', muted);
            });
        }

        // Manual Mining Clicker Button
        const mineBtn = document.getElementById('manualMineBtn');
        if (mineBtn) {
            mineBtn.addEventListener('click', (e) => {
                audio.playClick();
                const earned = this.mining.manualMine(1 + (this.shop.genesisBlocks * 0.5));
                this.btc += earned;

                // Create Floating Click Particle Effect
                this.createClickParticle(e.clientX, e.clientY, `+${(earned * 100000000).toFixed(0)} sats`);
                this.renderHeaderStats();
            });
        }

        // Auto-Clicker Controls
        const autoClickToggleBtn = document.getElementById('autoClickToggleBtn');
        const autoClickUpgradeBtn = document.getElementById('autoClickUpgradeBtn');

        if (autoClickToggleBtn) {
            autoClickToggleBtn.addEventListener('click', () => {
                if (this.mining.autoClickLevel === 0) {
                    return alert('오토클리커를 먼저 구매해야 활성화할 수 있습니다.');
                }
                this.mining.autoClickActive = !this.mining.autoClickActive;
                audio.playClick();
                this.renderMiningTab();
            });
        }

        if (autoClickUpgradeBtn) {
            autoClickUpgradeBtn.addEventListener('click', () => {
                const res = this.mining.upgradeAutoClicker(this.cashUSD);
                if (res.success) {
                    this.cashUSD -= res.price;
                    audio.playBuy();
                    this.renderAll();
                } else {
                    alert(res.reason);
                }
            });
        }

        // Spot Trade Form (Buy/Sell BTC)
        const buyBtcBtn = document.getElementById('buyBtcBtn');
        const sellBtcBtn = document.getElementById('sellBtcBtn');
        const tradeAmountInput = document.getElementById('tradeAmountInput');

        if (buyBtcBtn) {
            buyBtcBtn.addEventListener('click', () => {
                const usdAmount = parseFloat(tradeAmountInput.value) || 0;
                if (usdAmount <= 0) return alert('올바른 금액을 입력하세요.');
                if (this.cashUSD < usdAmount) return alert('현금 잔액이 부족합니다.');

                const currentBtcPrice = this.market.btcPrice;
                const btcAmount = usdAmount / currentBtcPrice;
                this.cashUSD -= usdAmount;
                this.btc += btcAmount;
                this.totalBtcBoughtCostUSD += usdAmount;
                this.totalBtcBoughtQty += btcAmount;
                audio.playBuy();

                // 1 BTC Price Toast Notification on Purchase
                const priceFormatted = `$${currentBtcPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                this.showMiningNotice(`🟢 비트코인 매수 완료! (당시 BTC 1개 시세: ${priceFormatted})`, 'green');
                this.triggerGlobalBanner('TTEOKSANG', `🟢 비트코인 ${btcAmount.toFixed(6)} BTC 매수 완료! (체결 당시 BTC 1개 가격: ${priceFormatted})`);
                
                this.renderAll();
            });
        }

        if (sellBtcBtn) {
            let holdTimer = null;
            let isLongPress = false;

            const onPointerDown = () => {
                isLongPress = false;
                holdTimer = setTimeout(() => {
                    isLongPress = true;
                    this.sellAllBtc();
                }, 450); // 450ms hold triggers Sell All (전량 매도)
            };

            const onPointerUp = () => {
                if (holdTimer) {
                    clearTimeout(holdTimer);
                    holdTimer = null;
                }
                if (!isLongPress) {
                    if (!this.executeSellBtc()) {
                        alert('보유 비트코인이 부족하거나 거래 금액을 확인하세요.');
                    }
                }
            };

            sellBtcBtn.addEventListener('mousedown', onPointerDown);
            sellBtcBtn.addEventListener('mouseup', onPointerUp);
            sellBtcBtn.addEventListener('mouseleave', () => {
                if (holdTimer) {
                    clearTimeout(holdTimer);
                    holdTimer = null;
                }
            });

            sellBtcBtn.addEventListener('touchstart', (e) => {
                e.preventDefault();
                onPointerDown();
            });
            sellBtcBtn.addEventListener('touchend', (e) => {
                e.preventDefault();
                onPointerUp();
            });
        }

        // Margin Futures Open Position Form
        const openMarginBtn = document.getElementById('openMarginBtn');
        if (openMarginBtn) {
            openMarginBtn.addEventListener('click', () => {
                const marginUSD = parseFloat(document.getElementById('marginAmountInput').value) || 0;
                const leverage = parseInt(document.getElementById('leverageSelect').value) || 10;
                const type = this.tradeType;

                if (marginUSD <= 0) return alert('올바른 증거금을 입력하세요.');
                if (this.cashUSD < marginUSD) return alert('증거금이 부족합니다.');

                const res = this.trading.openPosition({
                    type,
                    symbol: 'BTC',
                    entryPrice: this.market.btcPrice,
                    marginUSD,
                    leverage
                });

                if (res.success) {
                    this.cashUSD -= marginUSD;
                    audio.playBuy();
                    this.renderAll();
                } else {
                    alert(res.reason);
                }
            });
        }

        // Long / Short Switch Buttons
        const btnLong = document.getElementById('btnTradeLong');
        const btnShort = document.getElementById('btnTradeShort');
        if (btnLong && btnShort) {
            btnLong.addEventListener('click', () => {
                this.tradeType = 'LONG';
                btnLong.classList.add('active-long');
                btnShort.classList.remove('active-short');
            });
            btnShort.addEventListener('click', () => {
                this.tradeType = 'SHORT';
                btnShort.classList.add('active-short');
                btnLong.classList.remove('active-long');
            });
        }

        // Electricity Bill Pay Button
        const payBillBtn = document.getElementById('payElectricBillBtn');
        if (payBillBtn) {
            payBillBtn.addEventListener('click', () => {
                const bill = this.mining.unpaidElectricBill;
                if (bill <= 0) return alert('납부할 전기세가 없습니다.');
                if (this.cashUSD < bill) return alert('전기세를 낼 현금이 부족합니다!');

                this.cashUSD -= bill;
                this.mining.unpaidElectricBill = 0;
                audio.playBuy();
                this.renderAll();
            });
        }

        // Hard Fork Prestige Button
        const hardForkBtn = document.getElementById('hardForkBtn');
        if (hardForkBtn) {
            hardForkBtn.addEventListener('click', () => {
                const check = this.shop.calculatePrestigeReward(this);
                if (!check.eligible) return alert(check.required);

                if (confirm(`하드포크를 실행하시겠습니까?\n제네시스 블록 ${check.blocksGained}개를 획득하고 영구적 채굴 및 트레이딩 버프를 얻습니다!`)) {
                    const res = this.shop.executeHardFork(this);
                    if (res.success) {
                        audio.playHalving();
                        alert(`🎉 하드포크 완료! 제네시스 블록 +${res.genesisBlocksGained}개 획득!`);
                        this.renderAll();
                    }
                }
            });
        }

        // Reset Game Button
        const resetBtn = document.getElementById('resetGameBtn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                if (confirm('게임 데이터를 초기화하시겠습니까? (모든 진행 상황이 삭제됩니다)')) {
                    localStorage.removeItem('btc_tycoon_save');
                    location.reload();
                }
            });
        }
    }

    setupTabNavigation() {
        const tabs = document.querySelectorAll('.tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const targetTab = tab.dataset.tab;
                this.selectedTab = targetTab;

                document.querySelectorAll('.tab-content').forEach(c => {
                    c.style.display = 'none';
                });
                const activeContent = document.getElementById(`tab-${targetTab}`);
                if (activeContent) activeContent.style.display = 'block';

                if (targetTab === 'trading') {
                    this.chart.resizeCanvas();
                }
            });
        });
    }

    executeSellBtc() {
        const tradeAmountInput = document.getElementById('tradeAmountInput');
        const usdAmount = parseFloat(tradeAmountInput ? tradeAmountInput.value : 500) || 0;
        if (usdAmount <= 0) return false;

        const btcAmountNeeded = usdAmount / this.market.btcPrice;
        if (this.btc < btcAmountNeeded) return false;

        if (this.totalBtcBoughtQty > 0) {
            const sellRatio = Math.min(1, btcAmountNeeded / this.totalBtcBoughtQty);
            this.totalBtcBoughtCostUSD = Math.max(0, this.totalBtcBoughtCostUSD - (this.totalBtcBoughtCostUSD * sellRatio));
            this.totalBtcBoughtQty = Math.max(0, this.totalBtcBoughtQty - (this.totalBtcBoughtQty * sellRatio));
        }

        this.btc -= btcAmountNeeded;
        this.cashUSD += usdAmount;
        audio.playSell();
        this.renderAll();
        return true;
    }

    sellAllBtc() {
        if (this.btc <= 0) {
            this.showMiningNotice('⚠️ 보유한 비트코인이 없습니다.', 'red');
            return false;
        }

        const currentPrice = this.market.btcPrice;
        const totalUsdReturn = this.btc * currentPrice;
        const soldBtcQty = this.btc;

        this.cashUSD += totalUsdReturn;
        this.btc = 0;
        this.totalBtcBoughtCostUSD = 0;
        this.totalBtcBoughtQty = 0;

        audio.playSell();

        const formattedUsd = `$${totalUsdReturn.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        this.showMiningNotice(`🔴 보유 비트코인 ${soldBtcQty.toFixed(8)} BTC 전량 매도 완료! (+${formattedUsd})`, 'red');
        this.triggerGlobalBanner('NARAK', `🔴 비트코인 ${soldBtcQty.toFixed(6)} BTC 전량 매도 완료! (${formattedUsd} 현금 환전)`);
        this.renderAll();
        return true;
    }

    triggerGlobalBanner(type, text) {
        const bannerEl = document.getElementById('globalEventBanner');
        const textEl = document.getElementById('globalEventText');
        if (!bannerEl || !textEl) return;

        if (type === 'TTEOKSANG') {
            bannerEl.style.background = 'linear-gradient(90deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.95))';
            bannerEl.style.color = '#ffffff';
            textEl.innerHTML = `🚀 [떡상 Alert] ${text}`;
        } else if (type === 'NARAK') {
            bannerEl.style.background = 'linear-gradient(90deg, rgba(239, 68, 68, 0.95), rgba(185, 28, 28, 0.95))';
            bannerEl.style.color = '#ffffff';
            textEl.innerHTML = `📉 [나락 Alert] ${text}`;
        }

        bannerEl.style.display = 'block';

        if (this.bannerTimer) clearTimeout(this.bannerTimer);
        this.bannerTimer = setTimeout(() => {
            bannerEl.style.display = 'none';
        }, 5000);
    }

    tickSecond() {
        // Market Price Tick
        const priceInfo = this.market.tick();

        // Trigger Global Everywhere Banner on 떡상 / 나락 events
        if (priceInfo.marketEvent) {
            this.triggerGlobalBanner(priceInfo.marketEvent.type, priceInfo.marketEvent.title);
        }

        // Mining Tick
        const miningResult = this.mining.tickMining(1);
        if (miningResult.blockMined) {
            audio.playMineBlock();
            this.showMiningNotice(`🧊 블록 #${this.mining.blockHeight} 채굴 성공! (+${this.mining.blockReward} BTC)`);
        }

        // Auto-Clicker Tick
        if (this.mining.autoClickActive && this.mining.autoClickCPS > 0) {
            const autoClickEarned = this.mining.manualMine(this.mining.autoClickCPS * (1 + (this.shop.genesisBlocks * 0.5)));
            this.btc += autoClickEarned;

            const mineBtn = document.getElementById('manualMineBtn');
            if (mineBtn) {
                mineBtn.classList.add('pulse');
                setTimeout(() => mineBtn.classList.remove('pulse'), 300);
            }
        }

        // Add candle tick every 5 seconds
        if (Date.now() % 5000 < 1000) {
            this.chart.addCandle({
                open: priceInfo.prevPrice,
                high: Math.max(priceInfo.prevPrice, priceInfo.btcPrice),
                low: Math.min(priceInfo.prevPrice, priceInfo.btcPrice),
                close: priceInfo.btcPrice,
                volume: Math.random() * 8 + 1,
                timestamp: Date.now()
            });
        } else {
            this.chart.updateCurrentCandle(priceInfo.btcPrice, 0.1);
        }

        // Update Futures Positions & Check Liquidations
        const currentPrices = { BTC: this.market.btcPrice, ETH: this.market.altcoins.ETH.price };
        const liquidations = this.trading.updatePositions(currentPrices);

        liquidations.forEach(liq => {
            audio.playLiquidation();
            this.showMiningNotice(`🚨 [강제 청산] ${liq.type} ${liq.symbol} 포지션이 청산되었습니다! (-$${liq.marginUSD.toFixed(2)})`, 'red');
        });

        // Passive Income from Shop Real Estate
        this.shop.items.forEach(item => {
            if (item.passiveCash && item.owned > 0) {
                this.cashUSD += item.passiveCash * item.owned;
            }
        });

        this.renderAll();
    }

    tickNews() {
        if (Math.random() > 0.3) {
            const newsItem = this.news.triggerRandomNews(this.market);
            this.renderNewsFeed();

            if (newsItem.type === 'BULL') {
                this.triggerGlobalBanner('TTEOKSANG', newsItem.text);
            } else if (newsItem.type === 'BEAR') {
                this.triggerGlobalBanner('NARAK', newsItem.text);
            }
        }
    }

    createClickParticle(x, y, text) {
        const p = document.createElement('div');
        p.className = 'click-particle';
        p.innerText = text;
        p.style.left = `${x}px`;
        p.style.top = `${y}px`;
        document.body.appendChild(p);

        setTimeout(() => p.remove(), 1000);
    }

    showMiningNotice(msg, color = 'green') {
        const ticker = document.getElementById('miningNoticeTicker');
        if (ticker) {
            ticker.innerText = msg;
            ticker.style.color = color === 'red' ? '#ef4444' : '#10b981';
            ticker.classList.add('pulse');
            setTimeout(() => ticker.classList.remove('pulse'), 1500);
        }
    }

    renderAll() {
        this.renderHeaderStats();
        this.renderMarketData();
        this.renderMiningTab();
        this.renderTradingTab();
        this.renderBtcPortfolioStats();
        this.renderShopTab();
        this.renderNewsFeed();
    }

    renderBtcPortfolioStats() {
        const spentEl = document.getElementById('statTotalBtcSpent');
        const qtyEl = document.getElementById('statTotalBtcBoughtQty');
        const avgPriceEl = document.getElementById('statAvgBuyPrice');
        const pnlEl = document.getElementById('statBtcUnrealizedPnl');

        if (!spentEl) return;

        const spent = this.totalBtcBoughtCostUSD;
        const qty = this.totalBtcBoughtQty;
        const avgPrice = qty > 0 ? (spent / qty) : 0;
        const currentValuation = qty * this.market.btcPrice;
        const pnlUSD = currentValuation - spent;
        const pnlPct = spent > 0 ? (pnlUSD / spent) * 100 : 0;

        spentEl.innerText = `$${spent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        qtyEl.innerText = `${qty.toFixed(8)} BTC`;
        avgPriceEl.innerText = `$${avgPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        
        if (pnlEl) {
            pnlEl.innerText = `${pnlUSD >= 0 ? '+' : ''}$${pnlUSD.toFixed(2)} (${pnlPct >= 0 ? '+' : ''}${pnlPct.toFixed(2)}%)`;
            pnlEl.style.color = pnlUSD >= 0 ? '#10b981' : '#ef4444';
        }
    }

    renderHeaderStats() {
        const btcValueUSD = this.btc * this.market.btcPrice;
        const totalNetWorthUSD = this.cashUSD + btcValueUSD;
        const totalNetWorthKRW = totalNetWorthUSD * this.krwRate;

        document.getElementById('statTotalNetWorth').innerHTML = `$${totalNetWorthUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span class="krw-text">(₩${(totalNetWorthKRW / 10000).toFixed(0)}만원)</span>`;
        document.getElementById('statCashBalance').innerText = `$${this.cashUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        document.getElementById('statBtcBalance').innerText = `${this.btc.toFixed(8)} BTC`;
        document.getElementById('statBtcPriceHeader').innerText = `$${this.market.btcPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        
        const btcChangeEl = document.getElementById('statBtcChangeHeader');
        if (btcChangeEl) {
            const chg = this.market.btcChange24h;
            btcChangeEl.innerText = `${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%`;
            btcChangeEl.className = `stat-badge ${chg >= 0 ? 'badge-up' : 'badge-down'}`;
        }

        // Render Prominent BTC Wallet Banner
        const bannerBtcAmountEl = document.getElementById('bannerBtcAmount');
        if (bannerBtcAmountEl) {
            bannerBtcAmountEl.innerText = `${this.btc.toFixed(8)} BTC`;
            document.getElementById('bannerSatsAmount').innerText = `${Math.floor(this.btc * 100000000).toLocaleString()} sats`;
            document.getElementById('bannerBtcUsdValue').innerText = `$${btcValueUSD.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
            
            const btcValueKRW = btcValueUSD * this.krwRate;
            let krwText = `₩${Math.floor(btcValueKRW).toLocaleString()}원`;
            if (btcValueKRW >= 100000000) {
                krwText = `₩${(btcValueKRW / 100000000).toFixed(2)}억원`;
            } else if (btcValueKRW >= 10000) {
                krwText = `₩${(btcValueKRW / 10000).toFixed(0)}만원`;
            }
            document.getElementById('bannerBtcKrwValue').innerText = krwText;

            const weightPct = totalNetWorthUSD > 0 ? (btcValueUSD / totalNetWorthUSD) * 100 : 0;
            const barEl = document.getElementById('bannerBtcWeightBar');
            if (barEl) barEl.style.width = `${Math.min(100, weightPct)}%`;
            const pctEl = document.getElementById('bannerBtcWeightPct');
            if (pctEl) pctEl.innerText = `${weightPct.toFixed(1)}%`;
        }
    }

    renderMarketData() {
        // Order Book
        const asksContainer = document.getElementById('orderBookAsks');
        const bidsContainer = document.getElementById('orderBookBids');

        if (asksContainer && bidsContainer) {
            asksContainer.innerHTML = this.market.orderBook.asks.map(a => `
                <div class="ob-row ask">
                    <span>$${a.price.toFixed(2)}</span>
                    <span>${a.volume}</span>
                </div>
            `).join('');

            bidsContainer.innerHTML = this.market.orderBook.bids.map(b => `
                <div class="ob-row bid">
                    <span>$${b.price.toFixed(2)}</span>
                    <span>${b.volume}</span>
                </div>
            `).join('');
        }

        // Live Trades Stream
        const tradesContainer = document.getElementById('liveTradesContainer');
        if (tradesContainer) {
            tradesContainer.innerHTML = this.market.recentTrades.map(t => `
                <div class="trade-row ${t.type === 'BUY' ? 'trade-buy' : 'trade-sell'}">
                    <span>${t.time}</span>
                    <span>${t.trader}</span>
                    <span>${t.type}</span>
                    <span>$${t.price.toFixed(2)}</span>
                    <span>${t.vol} BTC</span>
                </div>
            `).join('');
        }
    }

    renderMiningTab() {
        document.getElementById('miningTotalHash').innerText = `${this.mining.totalHashrate.toFixed(4)} TH/s`;
        document.getElementById('miningPowerKW').innerText = `${this.mining.powerConsumptionKW.toFixed(2)} kW`;
        document.getElementById('miningElectricBill').innerText = `$${this.mining.unpaidElectricBill.toFixed(2)}`;
        document.getElementById('miningBlockHeight').innerText = `#${this.mining.blockHeight.toLocaleString()}`;
        document.getElementById('miningHalvingBlocks').innerText = `${this.mining.blocksUntilHalving} 블록 남음`;
        document.getElementById('miningBlockReward').innerText = `${this.mining.blockReward} BTC`;

        // Auto-Clicker UI Update
        const toggleBtn = document.getElementById('autoClickToggleBtn');
        const upgradeBtn = document.getElementById('autoClickUpgradeBtn');
        const statusText = document.getElementById('autoClickStatusText');

        if (toggleBtn && upgradeBtn && statusText) {
            const isActive = this.mining.autoClickActive;
            const lvl = this.mining.autoClickLevel;
            const cps = this.mining.autoClickCPS;

            toggleBtn.innerHTML = isActive ? `🤖 오토 클리커: ON (${cps}회/초)` : `🤖 오토 클리커: OFF (${cps}회/초)`;
            toggleBtn.style.background = isActive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.2)';
            toggleBtn.style.borderColor = isActive ? '#10b981' : '#ef4444';

            if (lvl >= this.mining.autoClickUpgrades.length) {
                upgradeBtn.innerText = '🚀 오토클리커 최고 등급 달성 (MAX)';
                upgradeBtn.disabled = true;
            } else {
                const next = this.mining.autoClickUpgrades[lvl];
                upgradeBtn.innerText = `🚀 ${next.name} ($${next.price.toLocaleString()} - ${next.cps}회/초)`;
                upgradeBtn.disabled = this.cashUSD < next.price;
            }

            statusText.innerText = lvl === 0 ? '오토클리커 미보유 (구매 시 자동 클릭 시작)' : (isActive ? `오토클리커가 초당 ${cps}회 속도로 자동 채굴 중입니다!` : '오토클리커가 일시 정지되었습니다.');
            statusText.style.color = isActive ? '#10b981' : 'var(--text-muted)';
        }

        // Render Rigs List
        const rigsContainer = document.getElementById('miningRigsContainer');
        if (rigsContainer) {
            rigsContainer.innerHTML = this.mining.rigs.map(rig => {
                const price = this.mining.getRigPrice(rig);
                const canAfford = this.cashUSD >= price;

                return `
                    <div class="rig-card ${canAfford ? '' : 'disabled'}">
                        <div class="rig-icon">${rig.icon}</div>
                        <div class="rig-info">
                            <div class="rig-title">${rig.name} <span class="rig-count">x${rig.count}</span></div>
                            <div class="rig-desc">해시파워: +${rig.hashrate} TH/s | 전력: ${rig.powerKW} kW</div>
                            <div class="rig-price">$${price.toLocaleString()}</div>
                        </div>
                        <button class="btn btn-buy-rig" data-rig="${rig.id}" ${canAfford ? '' : 'disabled'}>구매</button>
                    </div>
                `;
            }).join('');

            // Bind Rig Purchase Event
            rigsContainer.querySelectorAll('.btn-buy-rig').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const rigId = e.target.dataset.rig;
                    const res = this.mining.buyRig(rigId, this.cashUSD);
                    if (res.success) {
                        this.cashUSD -= res.price;
                        audio.playBuy();
                        this.renderAll();
                    } else {
                        alert(res.reason);
                    }
                });
            });
        }
    }

    renderTradingTab() {
        // Active Futures Positions List
        const posContainer = document.getElementById('marginPositionsContainer');
        if (posContainer) {
            if (this.trading.positions.length === 0) {
                posContainer.innerHTML = '<div class="empty-state">현재 오픈된 마진 포지션이 없습니다.</div>';
            } else {
                posContainer.innerHTML = this.trading.positions.map(p => `
                    <div class="position-card ${p.pnlUSD >= 0 ? 'pos-green' : 'pos-red'}">
                        <div class="pos-header">
                            <span class="pos-badge ${p.type}">${p.type} ${p.symbol} ${p.leverage}x</span>
                            <span class="pos-pnl ${p.pnlUSD >= 0 ? 'text-green' : 'text-red'}">
                                ${p.pnlUSD >= 0 ? '+' : ''}$${p.pnlUSD.toFixed(2)} (${p.pnlPct >= 0 ? '+' : ''}${p.pnlPct.toFixed(2)}%)
                            </span>
                        </div>
                        <div class="pos-details">
                            <div>진입가: $${p.entryPrice.toFixed(2)}</div>
                            <div>증거금: $${p.marginUSD.toFixed(2)}</div>
                            <div>청산가: $${p.liqPrice.toFixed(2)}</div>
                            <div>총가치: $${p.totalValue.toFixed(2)}</div>
                        </div>
                        <button class="btn btn-close-pos" data-id="${p.id}">포지션 청산</button>
                    </div>
                `).join('');

                posContainer.querySelectorAll('.btn-close-pos').forEach(b => {
                    b.addEventListener('click', (e) => {
                        const id = e.target.dataset.id;
                        const res = this.trading.closePosition(id, this.market.btcPrice);
                        if (res.success) {
                            this.cashUSD += res.returnCash;
                            if (res.pnlUSD >= 0) audio.playBuy(); else audio.playSell();
                            this.renderAll();
                        }
                    });
                });
            }
        }
    }

    renderShopTab() {
        const shopContainer = document.getElementById('shopItemsContainer');
        if (shopContainer) {
            shopContainer.innerHTML = this.shop.items.map(item => {
                const currentPrice = Math.floor(item.priceUSD * Math.pow(1.3, item.owned));
                const canAfford = this.cashUSD >= currentPrice;

                return `
                    <div class="shop-card ${canAfford ? '' : 'disabled'}">
                        <div class="shop-icon">${item.icon}</div>
                        <div class="shop-info">
                            <div class="shop-title">${item.name} <span class="shop-owned">보유: ${item.owned}개</span></div>
                            <div class="shop-desc">${item.desc}</div>
                            <div class="shop-price">$${currentPrice.toLocaleString()}</div>
                        </div>
                        <button class="btn btn-buy-shop" data-item="${item.id}" ${canAfford ? '' : 'disabled'}>구매하기</button>
                    </div>
                `;
            }).join('');

            shopContainer.querySelectorAll('.btn-buy-shop').forEach(b => {
                b.addEventListener('click', (e) => {
                    const itemId = e.target.dataset.item;
                    const res = this.shop.buyItem(itemId, this);
                    if (res.success) {
                        audio.playBuy();
                        this.renderAll();
                    } else {
                        alert(res.reason);
                    }
                });
            });
        }

        // Hard Fork Info
        document.getElementById('genesisBlocksCount').innerText = `${this.shop.genesisBlocks}개`;
        const pfCheck = this.shop.calculatePrestigeReward(this);
        const pfBtn = document.getElementById('hardForkBtn');
        if (pfBtn) {
            pfBtn.innerText = pfCheck.eligible ? `하드포크 실행 (제네시스 블록 +${pfCheck.blocksGained}개)` : '하드포크 조건 미달성';
            pfBtn.disabled = !pfCheck.eligible;
        }
    }

    renderNewsFeed() {
        const newsContainer = document.getElementById('newsFeedContainer');
        if (newsContainer) {
            newsContainer.innerHTML = this.news.newsFeed.map(n => `
                <div class="news-item news-${n.type.toLowerCase()}">
                    <span class="news-time">[${n.time}]</span>
                    <span class="news-text">${n.text}</span>
                </div>
            `).join('');
        }

        // Fear & Greed Meter
        const meterLabel = this.news.getFearGreedLabel();
        const fgEl = document.getElementById('fearGreedValue');
        if (fgEl) {
            fgEl.innerText = `${this.news.fearGreedIndex} - ${meterLabel.label}`;
            fgEl.style.color = meterLabel.color;
        }
    }

    autoSave() {
        const saveState = {
            cashUSD: this.cashUSD,
            btc: this.btc,
            totalBtcBoughtCostUSD: this.totalBtcBoughtCostUSD,
            totalBtcBoughtQty: this.totalBtcBoughtQty,
            altBalances: this.altBalances,
            autoClickActive: this.mining.autoClickActive,
            autoClickLevel: this.mining.autoClickLevel,
            autoClickCPS: this.mining.autoClickCPS,
            rigs: this.mining.rigs.map(r => ({ id: r.id, count: r.count })),
            shopItems: this.shop.items.map(i => ({ id: i.id, owned: i.owned })),
            genesisBlocks: this.shop.genesisBlocks,
            unpaidElectricBill: this.mining.unpaidElectricBill
        };

        try {
            localStorage.setItem('btc_tycoon_save', JSON.stringify(saveState));
        } catch (e) {
            console.warn('AutoSave failed', e);
        }
    }

    loadSavedState() {
        try {
            const raw = localStorage.getItem('btc_tycoon_save');
            if (!raw) return;
            const data = JSON.parse(raw);

            this.cashUSD = data.cashUSD || 1000.00;
            this.btc = data.btc || 0.00000000;
            this.totalBtcBoughtCostUSD = data.totalBtcBoughtCostUSD || 0.00;
            this.totalBtcBoughtQty = data.totalBtcBoughtQty || 0.00000000;
            this.altBalances = data.altBalances || this.altBalances;

            if (data.autoClickLevel !== undefined) {
                this.mining.autoClickLevel = data.autoClickLevel;
                this.mining.autoClickActive = !!data.autoClickActive;
                this.mining.autoClickCPS = data.autoClickCPS || 0;
            }

            if (data.rigs) {
                data.rigs.forEach(savedRig => {
                    const r = this.mining.rigs.find(x => x.id === savedRig.id);
                    if (r) r.count = savedRig.count;
                });
                this.mining.calculateTotalHashrate();
            }

            if (data.shopItems) {
                data.shopItems.forEach(savedItem => {
                    const item = this.shop.items.find(x => x.id === savedItem.id);
                    if (item) item.owned = savedItem.owned;
                });
            }

            if (data.genesisBlocks) {
                this.shop.genesisBlocks = data.genesisBlocks;
            }

            if (data.unpaidElectricBill) {
                this.mining.unpaidElectricBill = data.unpaidElectricBill;
            }
        } catch (e) {
            console.error('Save load error', e);
        }
    }
}

// Instantiate on DOM Loaded
window.addEventListener('DOMContentLoaded', () => {
    window.app = new GameApp();
});
