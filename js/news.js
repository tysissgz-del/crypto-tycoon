/**
 * Breaking News & Fear-Greed Sentiment Engine
 */

export class NewsEngine {
    constructor() {
        this.newsFeed = [];
        this.fearGreedIndex = 65; // 0 (Extreme Fear) ~ 100 (Extreme Greed)
        this.lastNewsTime = 0;

        this.headlineTemplates = [
            // Bullish
            { text: '🚨 [속보] SEC, 비트코인 현물 ETF 및 옵션 전격 승인!', impact: 0.04, sentimentShift: +15, type: 'BULL' },
            { text: '🌐 미연준(Fed), 전격 기준금리 0.50%p 인하! 자산 시장 떡상 폭등', impact: 0.035, sentimentShift: +12, type: 'BULL' },
            { text: '🇸🇻 엘살바도르, 비트코인 국가 예치금 추가 10,000 BTC 매수 완료', impact: 0.02, sentimentShift: +8, type: 'BULL' },
            { text: '🚀 일론 머스크 "스페이스X, 결제 수단으로 비트코인 공식 도입 고려"', impact: 0.03, sentimentShift: +10, type: 'BULL' },
            { text: '📈 비트코인 해시레이트 역대 최고치(ATH) 경신! 네트워크 보안 최고조', impact: 0.015, sentimentShift: +5, type: 'BULL' },
            { text: '🏦 세계 최대 자산운용사 블랙록, 비트코인 보유량 50만개 돌파', impact: 0.025, sentimentShift: +9, type: 'BULL' },

            // Bearish
            { text: '⚠️ [악재] 글로벌 암호화폐 거래소 대형 해킹 발생! $5억 상당 유출', impact: -0.04, sentimentShift: -15, type: 'BEAR' },
            { text: '🛑 미 재무부, 암호화폐 채굴 전력에 30% 징벌적 세금 부과 법안 발의', impact: -0.03, sentimentShift: -10, type: 'BEAR' },
            { text: '📉 마운트곡스 채권자 변제 물량 50,000 BTC 거래소 유입 포착', impact: -0.025, sentimentShift: -8, type: 'BEAR' },
            { text: '⚡ 파월 연준 의장 "인플레이션 우려로 금리 인상 가능성 재검토"', impact: -0.02, sentimentShift: -7, type: 'BEAR' },
            { text: '🐳 고래 지갑에서 20,000 BTC 바이낸스로 덤핑 전송 덤프 징후', impact: -0.03, sentimentShift: -11, type: 'BEAR' },

            // Neutral / Memes
            { text: '💬 사토시 나카모토 추정 지갑 14년 만에 0.001 BTC 테스팅 이체', impact: 0.01, sentimentShift: +2, type: 'NEUTRAL' },
            { text: '🐕 도지코인 마스코트 카보수 재단, 웹3 게이밍 생태계 발표', impact: 0.005, sentimentShift: +1, type: 'NEUTRAL' }
        ];

        this.initDefaultNews();
    }

    initDefaultNews() {
        this.addNews(this.headlineTemplates[0]);
        this.addNews(this.headlineTemplates[4]);
    }

    addNews(headlineObj) {
        const item = {
            id: 'news_' + Date.now(),
            text: headlineObj.text,
            type: headlineObj.type, // 'BULL', 'BEAR', 'NEUTRAL'
            time: new Date().toLocaleTimeString('ko-KR', { hour12: false, hour: '2-digit', minute: '2-digit' })
        };

        this.newsFeed.unshift(item);
        if (this.newsFeed.length > 20) this.newsFeed.pop();

        // Adjust Fear & Greed Index
        this.fearGreedIndex = Math.max(5, Math.min(95, this.fearGreedIndex + headlineObj.sentimentShift));

        return item;
    }

    triggerRandomNews(marketEngine) {
        const randomIndex = Math.floor(Math.random() * this.headlineTemplates.length);
        const template = this.headlineTemplates[randomIndex];
        const item = this.addNews(template);

        if (marketEngine) {
            marketEngine.setNewsImpact(template.impact, 8, template.text);
            marketEngine.sentiment = this.fearGreedIndex;
        }

        return item;
    }

    getFearGreedLabel() {
        const v = this.fearGreedIndex;
        if (v >= 75) return { label: '극도의 탐욕 (Extreme Greed)', color: '#10b981' };
        if (v >= 55) return { label: '탐욕 (Greed)', color: '#34d399' };
        if (v >= 45) return { label: '중립 (Neutral)', color: '#f59e0b' };
        if (v >= 25) return { label: '공포 (Fear)', color: '#fb923c' };
        return { label: '극도의 공포 (Extreme Fear)', color: '#ef4444' };
    }
}
