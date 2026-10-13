/**
 * Real-Time Canvas Candlestick & MA Chart Renderer
 */

export class CryptoChart {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
        this.candles = []; // Array of { open, high, low, close, volume, timestamp }
        this.maxCandles = 60; // Max visible candles on screen
        this.hoverIndex = -1;
        this.hoverPos = null;

        if (this.canvas) {
            this.resizeCanvas();
            window.addEventListener('resize', () => this.resizeCanvas());
            this.bindMouseEvents();
        }
    }

    resizeCanvas() {
        if (!this.canvas) return;
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        if (this.ctx) {
            this.ctx.scale(dpr, dpr);
        }
        this.width = rect.width;
        this.height = rect.height;
        this.render();
    }

    bindMouseEvents() {
        if (!this.canvas) return;

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            this.hoverPos = { x, y };

            // Calculate hover candle index
            if (this.candles.length > 0) {
                const paddingRight = 60;
                const chartWidth = this.width - paddingRight;
                const candleWidth = chartWidth / Math.max(this.candles.length, 30);
                const idx = Math.floor(x / candleWidth);
                if (idx >= 0 && idx < this.candles.length) {
                    this.hoverIndex = idx;
                } else {
                    this.hoverIndex = -1;
                }
            }
            this.render();
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.hoverPos = null;
            this.hoverIndex = -1;
            this.render();
        });
    }

    setCandles(candles) {
        this.candles = candles;
        this.render();
    }

    addCandle(candle) {
        this.candles.push(candle);
        if (this.candles.length > 120) {
            this.candles.shift();
        }
        this.render();
    }

    updateCurrentCandle(price, volume = 0) {
        if (this.candles.length === 0) return;
        const current = this.candles[this.candles.length - 1];
        current.close = price;
        current.high = Math.max(current.high, price);
        current.low = Math.min(current.low, price);
        current.volume += volume;
        this.render();
    }

    calculateMA(period) {
        const ma = [];
        for (let i = 0; i < this.candles.length; i++) {
            if (i < period - 1) {
                ma.push(null);
            } else {
                let sum = 0;
                for (let j = 0; j < period; j++) {
                    sum += this.candles[i - j].close;
                }
                ma.push(sum / period);
            }
        }
        return ma;
    }

    render() {
        if (!this.ctx || !this.width || !this.height) return;
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Clear canvas with dark gradient background
        ctx.clearRect(0, 0, w, h);

        const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
        bgGrad.addColorStop(0, '#0c0f1d');
        bgGrad.addColorStop(1, '#070913');
        ctx.fillStyle = bgGrad;
        ctx.fillRect(0, 0, w, h);

        if (this.candles.length === 0) {
            ctx.fillStyle = '#6b7280';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('차트 데이터 대기 중...', w / 2, h / 2);
            return;
        }

        const paddingRight = 65;
        const paddingTop = 25;
        const paddingBottom = 40;
        const chartWidth = w - paddingRight;
        const chartHeight = h - paddingTop - paddingBottom;

        // Determine Min & Max Price
        let minPrice = Infinity;
        let maxPrice = -Infinity;

        const visibleCandles = this.candles.slice(-this.maxCandles);
        visibleCandles.forEach(c => {
            if (c.low < minPrice) minPrice = c.low;
            if (c.high > maxPrice) maxPrice = c.high;
        });

        // Add 2% margin to price bounds
        const range = (maxPrice - minPrice) || 1;
        minPrice -= range * 0.03;
        maxPrice += range * 0.03;

        // Price to Y coordinate
        const getY = (price) => {
            return paddingTop + chartHeight - ((price - minPrice) / (maxPrice - minPrice)) * chartHeight;
        };

        // Draw Horizontal Grid Lines & Price Labels
        const gridCount = 5;
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#1e293b';
        ctx.fillStyle = '#64748b';
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';

        for (let i = 0; i <= gridCount; i++) {
            const price = minPrice + (maxPrice - minPrice) * (i / gridCount);
            const y = getY(price);

            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(chartWidth, y);
            ctx.stroke();

            ctx.fillText(`$${price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, chartWidth + 6, y + 4);
        }

        const candleWidth = chartWidth / visibleCandles.length;
        const barWidth = Math.max(candleWidth * 0.65, 2);

        // Draw Moving Averages (MA7 - Amber, MA25 - Cyan)
        const ma7 = this.calculateMA(7).slice(-this.maxCandles);
        const ma25 = this.calculateMA(25).slice(-this.maxCandles);

        const drawMALine = (maData, color) => {
            ctx.beginPath();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            let started = false;

            maData.forEach((val, idx) => {
                if (val !== null) {
                    const x = idx * candleWidth + candleWidth / 2;
                    const y = getY(val);
                    if (!started) {
                        ctx.moveTo(x, y);
                        started = true;
                    } else {
                        ctx.lineTo(x, y);
                    }
                }
            });
            ctx.stroke();
        };

        drawMALine(ma7, '#f59e0b');
        drawMALine(ma25, '#06b6d4');

        // Draw Candlesticks
        visibleCandles.forEach((c, idx) => {
            const x = idx * candleWidth + candleWidth / 2;
            const openY = getY(c.open);
            const closeY = getY(c.close);
            const highY = getY(c.high);
            const lowY = getY(c.low);

            const isBull = c.close >= c.open;
            const candleColor = isBull ? '#10b981' : '#ef4444';

            // Wick Line
            ctx.strokeStyle = candleColor;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(x, highY);
            ctx.lineTo(x, lowY);
            ctx.stroke();

            // Candle Body
            ctx.fillStyle = candleColor;
            const bodyY = Math.min(openY, closeY);
            const bodyHeight = Math.max(Math.abs(closeY - openY), 2);
            ctx.fillRect(x - barWidth / 2, bodyY, barWidth, bodyHeight);

            // Glow effect for latest candle
            if (idx === visibleCandles.length - 1) {
                ctx.shadowColor = candleColor;
                ctx.shadowBlur = 10;
                ctx.fillRect(x - barWidth / 2, bodyY, barWidth, bodyHeight);
                ctx.shadowBlur = 0; // reset
            }
        });

        // Current Price Line Marker
        const lastCandle = visibleCandles[visibleCandles.length - 1];
        if (lastCandle) {
            const lastY = getY(lastCandle.close);
            const isBull = lastCandle.close >= lastCandle.open;
            const tagColor = isBull ? '#10b981' : '#ef4444';

            ctx.beginPath();
            ctx.strokeStyle = tagColor;
            ctx.setLineDash([3, 3]);
            ctx.moveTo(0, lastY);
            ctx.lineTo(chartWidth, lastY);
            ctx.stroke();
            ctx.setLineDash([]); // reset

            // Right Tag Badge
            ctx.fillStyle = tagColor;
            ctx.fillRect(chartWidth, lastY - 10, paddingRight, 20);
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(`$${lastCandle.close.toFixed(2)}`, chartWidth + paddingRight / 2, lastY + 4);
        }

        // Crosshair & Hover Tooltip
        if (this.hoverPos && this.hoverIndex >= 0 && this.hoverIndex < visibleCandles.length) {
            const hc = visibleCandles[this.hoverIndex];
            const hx = this.hoverIndex * candleWidth + candleWidth / 2;
            const hy = this.hoverPos.y;

            // Vertical crosshair line
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(hx, 0);
            ctx.lineTo(hx, h - paddingBottom);
            ctx.stroke();

            // Horizontal crosshair line
            ctx.beginPath();
            ctx.moveTo(0, hy);
            ctx.lineTo(chartWidth, hy);
            ctx.stroke();
            ctx.setLineDash([]);

            // Render Header Info Bar
            ctx.fillStyle = '#ffffff';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'left';
            const hoverColor = hc.close >= hc.open ? '#10b981' : '#ef4444';
            ctx.fillText(`시가: $${hc.open.toFixed(2)}  고가: $${hc.high.toFixed(2)}  저가: $${hc.low.toFixed(2)}  종가: $${hc.close.toFixed(2)}`, 15, 18);
        }
    }
}
