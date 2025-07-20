# 匹配API使用示例

本文档提供AI智能社交匹配平台匹配API的详细使用示例和最佳实践。

## 概述

匹配API提供了完整的智能匹配功能，包括：
- 🎯 基础匹配推荐
- 🎛️ 偏好分类推荐  
- 📊 匹配历史记录
- 📈 匹配统计分析
- 🔍 详细匹配分析

## API接口列表

### 基础API
- `GET /api/v1/matching/recommendations/:eventId` - 获取匹配推荐
- `GET /api/v1/matching/preferences/:eventId` - 获取偏好分类推荐
- `GET /api/v1/matching/history/:eventId?` - 获取匹配历史
- `GET /api/v1/matching/stats/:eventId` - 获取统计信息
- `GET /api/v1/matching/score/:eventId/:targetUserId` - 获取特定匹配分数

## 使用示例

### 1. 基础匹配推荐

#### 简单推荐
```javascript
// 获取基础匹配推荐
const response = await fetch('/api/v1/matching/recommendations/event123', {
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN'
  }
});

const data = await response.json();
console.log('推荐用户:', data.data.recommendations);
```

#### 高级推荐配置
```javascript
// 使用高级配置获取推荐
const params = new URLSearchParams({
  limit: '15',                    // 返回15个推荐
  sort: 'PREFERENCE_FIRST',       // 偏好优先排序
  minScore: '70',                 // 最低70分
  diversity: '0.6',               // 60%多样性
  preferenceOnly: 'true',         // 仅偏好匹配
  includePartial: 'true'          // 包含部分匹配
});

const response = await fetch(`/api/v1/matching/recommendations/event123?${params}`, {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
});

const data = await response.json();
```

#### 响应数据结构
```json
{
  "success": true,
  "data": {
    "eventId": "event123",
    "userId": "user456",
    "recommendations": [
      {
        "target_user": {
          "id": "user789",
          "name": "张三",
          "position": "CEO",
          "company": "阿里巴巴",
          "industry": "科技",
          "bio": "技术创业者"
        },
        "match_score": 85,
        "recommendation_strength": "HIGH",
        "match_reasons": [
          {
            "type": "INDUSTRY",
            "description": "您们都在科技行业工作，有共同的行业背景和理解",
            "score": 0.9
          },
          {
            "type": "POSITION",
            "description": "您的CTO职位与对方的CEO职位形成完美的上下游关系",
            "score": 1.0
          }
        ],
        "common_interests": ["人工智能", "创业"],
        "business_synergies": ["技术创新"],
        "partial_match": {
          "matchedCriteria": ["目标职位", "目标行业"],
          "missedCriteria": ["商业目标"],
          "matchPercentage": 67,
          "explanation": "部分符合您的偏好（目标职位、目标行业），但在商业目标方面不匹配"
        }
      }
    ],
    "total": 10,
    "filters": {
      "diversityFactor": 0.6,
      "preferenceMatchOnly": true
    },
    "sortStrategy": "PREFERENCE_FIRST"
  }
}
```

### 2. 偏好分类推荐

#### 获取分类推荐
```javascript
// 获取基于偏好的分类推荐
const response = await fetch('/api/v1/matching/preferences/event123', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
});

const data = await response.json();

console.log('完美匹配:', data.data.perfect.length);
console.log('部分匹配:', data.data.partial.length);  
console.log('替代推荐:', data.data.alternative.length);
```

#### 严格模式
```javascript
// 严格模式 - 只返回高质量匹配
const response = await fetch('/api/v1/matching/preferences/event123?strict=true', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
});
```

#### 响应数据结构
```json
{
  "success": true,
  "data": {
    "eventId": "event123",
    "userId": "user456",
    "perfect": [
      // 90%+ 匹配的用户
    ],
    "partial": [
      // 50-89% 匹配的用户
    ],
    "alternative": [
      // <50% 匹配的用户
    ],
    "summary": {
      "perfectCount": 2,
      "partialCount": 5,
      "alternativeCount": 3,
      "total": 10
    },
    "strictMode": false
  }
}
```

### 3. 匹配历史记录

#### 获取特定会议历史
```javascript
// 获取特定会议的匹配历史
const response = await fetch('/api/v1/matching/history/event123', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
});

const data = await response.json();
console.log('历史记录:', data.data.history);
console.log('统计信息:', data.data.statistics);
```

#### 获取所有历史记录
```javascript
// 获取用户所有会议的匹配历史
const response = await fetch('/api/v1/matching/history', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
});
```

#### 过滤历史记录
```javascript
// 使用过滤器获取历史记录
const params = new URLSearchParams({
  limit: '20',           // 最多20条
  minScore: '75',        // 最低75分
  strength: 'HIGH',      // 仅高质量推荐
  includePast: 'true'    // 包含过往记录
});

const response = await fetch(`/api/v1/matching/history/event123?${params}`, {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
});
```

#### 响应数据结构
```json
{
  "success": true,
  "data": {
    "eventId": "event123",
    "userId": "user456",
    "history": [
      // MatchResult[] - 历史匹配结果
    ],
    "statistics": {
      "totalMatches": 25,
      "averageScore": 78,
      "highQualityMatches": 8,
      "topRecommendationStrength": "HIGH"
    },
    "filters": {
      "limit": 20,
      "minScore": 75,
      "strengthFilter": ["HIGH"],
      "includePastMatches": true
    }
  }
}
```

### 4. 匹配统计分析

#### 获取会议统计
```javascript
// 获取会议整体匹配统计
const response = await fetch('/api/v1/matching/stats/event123', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
});

const data = await response.json();
const stats = data.data.statistics;

console.log(`总匹配数: ${stats.totalMatches}`);
console.log(`平均分数: ${stats.averageScore}`);
console.log(`高质量匹配: ${stats.highQualityMatches}`);
```

#### 响应数据结构
```json
{
  "success": true,
  "data": {
    "eventId": "event123",
    "requestedBy": "user456",
    "statistics": {
      "totalMatches": 150,
      "averageScore": 72.5,
      "highQualityMatches": 45,
      "participantStats": {
        "totalParticipants": 50,
        "activeMatchers": 42,
        "averageMatchesPerUser": 3.0
      },
      "scoreDistribution": {
        "high": 45,     // 80-100分
        "medium": 78,   // 60-79分  
        "low": 27       // 0-59分
      }
    },
    "generatedAt": "2024-01-01T12:00:00.000Z"
  }
}
```

### 5. 详细匹配分析

#### 获取特定用户匹配详情
```javascript
// 获取与特定用户的详细匹配分析
const response = await fetch('/api/v1/matching/score/event123/target-user-id', {
  headers: { 'Authorization': 'Bearer YOUR_TOKEN' }
});

const data = await response.json();
const details = data.data.matchDetails;

console.log(`匹配分数: ${details.matchScore}`);
console.log(`推荐强度: ${details.recommendationStrength}`);
console.log(`匹配原因:`, details.matchReasons);
```

#### 响应数据结构
```json
{
  "success": true,
  "data": {
    "eventId": "event123",
    "userId": "user456",
    "targetUserId": "user789",
    "matchDetails": {
      "matchScore": 85,
      "recommendationStrength": "HIGH",
      "matchReasons": [
        {
          "type": "INDUSTRY",
          "description": "您们都在科技行业工作，有共同的行业背景和理解",
          "score": 0.9
        }
      ],
      "commonInterests": ["人工智能", "创业"],
      "businessSynergies": ["技术创新"],
      "partialMatch": {
        "matchedCriteria": ["目标职位", "目标行业"],
        "missedCriteria": ["商业目标"],
        "matchPercentage": 67,
        "explanation": "部分符合您的偏好设置"
      }
    },
    "targetUser": {
      "id": "user789",
      "name": "张三",
      "position": "CEO",
      "company": "阿里巴巴",
      "industry": "科技"
    }
  }
}
```

## 最佳实践

### 1. 性能优化

#### 合理设置limit参数
```javascript
// ✅ 好的做法：根据UI需求设置合理limit
const response = await fetch('/api/v1/matching/recommendations/event123?limit=10');

// ❌ 避免：请求过多数据
const response = await fetch('/api/v1/matching/recommendations/event123?limit=100');
```

#### 使用缓存
```javascript
// 缓存匹配结果，避免频繁请求
class MatchingCache {
  constructor() {
    this.cache = new Map();
  }
  
  async getRecommendations(eventId, options = {}) {
    const cacheKey = `${eventId}_${JSON.stringify(options)}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const response = await fetch(`/api/v1/matching/recommendations/${eventId}?${new URLSearchParams(options)}`);
    const data = await response.json();
    
    // 缓存5分钟
    this.cache.set(cacheKey, data);
    setTimeout(() => this.cache.delete(cacheKey), 5 * 60 * 1000);
    
    return data;
  }
}
```

### 2. 错误处理

#### 统一错误处理
```javascript
async function handleMatchingAPI(url, options = {}) {
  try {
    const response = await fetch(url, {
      headers: { 'Authorization': `Bearer ${token}` },
      ...options
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`API Error: ${errorData.error.code} - ${errorData.error.message}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Matching API Error:', error);
    
    // 用户友好的错误处理
    if (error.message.includes('UNAUTHORIZED')) {
      // 重新登录
      redirectToLogin();
    } else if (error.message.includes('MATCHING_ERROR')) {
      // 显示匹配错误提示
      showErrorMessage('匹配服务暂时不可用，请稍后重试');
    }
    
    throw error;
  }
}
```

### 3. 用户体验优化

#### 分页加载
```javascript
class MatchingPagination {
  constructor(eventId) {
    this.eventId = eventId;
    this.currentPage = 0;
    this.pageSize = 10;
    this.allResults = [];
  }
  
  async loadNextPage() {
    const response = await fetch(`/api/v1/matching/recommendations/${this.eventId}?limit=${this.pageSize}&offset=${this.currentPage * this.pageSize}`);
    const data = await response.json();
    
    this.allResults.push(...data.data.recommendations);
    this.currentPage++;
    
    return data.data.recommendations;
  }
}
```

#### 实时更新
```javascript
// 定期更新匹配结果
class MatchingUpdater {
  constructor(eventId) {
    this.eventId = eventId;
    this.updateInterval = null;
  }
  
  startUpdating(callback) {
    this.updateInterval = setInterval(async () => {
      try {
        const data = await this.getLatestMatches();
        callback(data);
      } catch (error) {
        console.error('Update failed:', error);
      }
    }, 30000); // 每30秒更新一次
  }
  
  stopUpdating() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  async getLatestMatches() {
    const response = await fetch(`/api/v1/matching/recommendations/${this.eventId}?sort=BALANCED&limit=10`);
    return await response.json();
  }
}
```

### 4. 数据可视化

#### 匹配统计图表
```javascript
// 使用Chart.js显示匹配分布
async function renderMatchingStats(eventId) {
  const response = await fetch(`/api/v1/matching/stats/${eventId}`);
  const data = await response.json();
  const stats = data.data.statistics;
  
  const ctx = document.getElementById('matchingChart').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['高质量匹配', '中等匹配', '低质量匹配'],
      datasets: [{
        data: [
          stats.scoreDistribution.high,
          stats.scoreDistribution.medium,
          stats.scoreDistribution.low
        ],
        backgroundColor: ['#4CAF50', '#FF9800', '#F44336']
      }]
    },
    options: {
      responsive: true,
      plugins: {
        title: {
          display: true,
          text: '匹配质量分布'
        }
      }
    }
  });
}
```

#### 匹配趋势分析
```javascript
// 分析匹配历史趋势
async function analyzeMatchingTrends(userId) {
  const response = await fetch(`/api/v1/matching/history`);
  const data = await response.json();
  const history = data.data.history;
  
  // 按时间分组
  const trends = history.reduce((acc, match) => {
    const date = new Date(match.created_at).toDateString();
    if (!acc[date]) acc[date] = [];
    acc[date].push(match);
    return acc;
  }, {});
  
  // 计算每日平均分数
  const dailyAverages = Object.entries(trends).map(([date, matches]) => ({
    date,
    averageScore: matches.reduce((sum, m) => sum + m.match_score, 0) / matches.length,
    matchCount: matches.length
  }));
  
  return dailyAverages;
}
```

## 完整示例：匹配仪表板

```html
<!DOCTYPE html>
<html>
<head>
    <title>智能匹配仪表板</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
</head>
<body>
    <div id="matchingDashboard">
        <h2>智能匹配仪表板</h2>
        
        <!-- 推荐列表 -->
        <div id="recommendations"></div>
        
        <!-- 统计图表 -->
        <canvas id="statsChart"></canvas>
        
        <!-- 历史记录 -->
        <div id="history"></div>
    </div>

    <script>
        class MatchingDashboard {
            constructor(eventId, token) {
                this.eventId = eventId;
                this.token = token;
            }
            
            async init() {
                await Promise.all([
                    this.loadRecommendations(),
                    this.loadStats(),
                    this.loadHistory()
                ]);
            }
            
            async loadRecommendations() {
                const response = await fetch(`/api/v1/matching/recommendations/${this.eventId}?limit=5&sort=BALANCED`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                });
                const data = await response.json();
                
                this.renderRecommendations(data.data.recommendations);
            }
            
            async loadStats() {
                const response = await fetch(`/api/v1/matching/stats/${this.eventId}`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                });
                const data = await response.json();
                
                this.renderStats(data.data.statistics);
            }
            
            async loadHistory() {
                const response = await fetch(`/api/v1/matching/history/${this.eventId}?limit=10`, {
                    headers: { 'Authorization': `Bearer ${this.token}` }
                });
                const data = await response.json();
                
                this.renderHistory(data.data.history);
            }
            
            renderRecommendations(recommendations) {
                const container = document.getElementById('recommendations');
                container.innerHTML = '<h3>推荐用户</h3>';
                
                recommendations.forEach(rec => {
                    const div = document.createElement('div');
                    div.innerHTML = `
                        <div class="recommendation-card">
                            <h4>${rec.target_user.name}</h4>
                            <p>${rec.target_user.position} @ ${rec.target_user.company}</p>
                            <p>匹配分数: ${rec.match_score}</p>
                            <p>推荐强度: ${rec.recommendation_strength}</p>
                            <details>
                                <summary>匹配原因</summary>
                                <ul>
                                    ${rec.match_reasons.map(r => `<li>${r.description}</li>`).join('')}
                                </ul>
                            </details>
                        </div>
                    `;
                    container.appendChild(div);
                });
            }
            
            renderStats(stats) {
                const ctx = document.getElementById('statsChart').getContext('2d');
                new Chart(ctx, {
                    type: 'bar',
                    data: {
                        labels: ['高质量', '中等质量', '低质量'],
                        datasets: [{
                            label: '匹配分布',
                            data: [
                                stats.scoreDistribution.high,
                                stats.scoreDistribution.medium,
                                stats.scoreDistribution.low
                            ],
                            backgroundColor: ['#4CAF50', '#FF9800', '#F44336']
                        }]
                    }
                });
            }
            
            renderHistory(history) {
                const container = document.getElementById('history');
                container.innerHTML = '<h3>匹配历史</h3>';
                
                history.forEach(match => {
                    const div = document.createElement('div');
                    div.innerHTML = `
                        <div class="history-item">
                            <span>${match.target_user.name}</span>
                            <span>分数: ${match.match_score}</span>
                            <span>${match.recommendation_strength}</span>
                        </div>
                    `;
                    container.appendChild(div);
                });
            }
        }
        
        // 初始化仪表板
        const dashboard = new MatchingDashboard('event123', 'your-token');
        dashboard.init();
    </script>
</body>
</html>
```

## 总结

匹配API提供了完整的智能匹配解决方案，支持：

- 🎯 **多样化推荐策略**：分数优先、偏好优先、多样性、平衡排序
- 📊 **详细分析数据**：匹配原因、偏好分析、统计信息
- 🔄 **历史记录管理**：自动保存、智能查询、趋势分析
- 🎛️ **灵活配置选项**：过滤器、排序、分页、缓存

通过合理使用这些API，您可以构建出色的智能匹配体验，提高用户的社交效率和满意度。 