# Postman API 测试指南

本指南详细说明如何使用Postman测试AI智能社交匹配平台的所有API接口。

## 📋 目录
1. [环境设置](#环境设置)
2. [认证配置](#认证配置)  
3. [测试数据准备](#测试数据准备)
4. [API测试步骤](#api测试步骤)
5. [测试场景](#测试场景)
6. [故障排除](#故障排除)

## 🔧 环境设置

### 1. 创建Postman环境

在Postman中创建新环境，配置以下变量：

| 变量名 | 值 | 描述 |
|--------|----|----|
| `baseUrl` | `http://localhost:3000` | API基础URL |
| `apiVersion` | `v1` | API版本 |
| `authToken` | (动态设置) | JWT认证令牌 |
| `userId` | (动态设置) | 当前用户ID |
| `eventId` | (动态设置) | 测试会议ID |
| `targetUserId` | (动态设置) | 目标用户ID |

### 2. 环境变量设置示例

```json
{
  "id": "matching-api-env",
  "name": "Matching API Environment",
  "values": [
    {
      "key": "baseUrl",
      "value": "http://localhost:3000",
      "enabled": true
    },
    {
      "key": "apiVersion", 
      "value": "v1",
      "enabled": true
    },
    {
      "key": "authToken",
      "value": "",
      "enabled": true
    },
    {
      "key": "userId",
      "value": "",
      "enabled": true
    },
    {
      "key": "eventId",
      "value": "",
      "enabled": true
    },
    {
      "key": "targetUserId",
      "value": "",
      "enabled": true
    }
  ]
}
```

## 🔐 认证配置

### 1. 用户注册和登录

首先需要创建测试用户并获取认证令牌：

#### 注册用户1
```http
POST {{baseUrl}}/api/{{apiVersion}}/auth/register
Content-Type: application/json

{
  "email": "test1@example.com",
  "password": "password123",
  "name": "张三",
  "company": "阿里巴巴",
  "position": "CTO",
  "industry": "科技",
  "bio": "资深技术专家"
}
```

#### 注册用户2
```http
POST {{baseUrl}}/api/{{apiVersion}}/auth/register
Content-Type: application/json

{
  "email": "test2@example.com", 
  "password": "password123",
  "name": "李四",
  "company": "腾讯",
  "position": "CEO",
  "industry": "科技",
  "bio": "互联网创业者"
}
```

#### 登录获取Token
```http
POST {{baseUrl}}/api/{{apiVersion}}/auth/login
Content-Type: application/json

{
  "email": "test1@example.com",
  "password": "password123"
}
```

**Post-response Script (自动设置token):**
```javascript
// 自动提取token并设置为环境变量
if (pm.response.code === 200) {
    const responseJson = pm.response.json();
    pm.environment.set("authToken", responseJson.data.token);
    pm.environment.set("userId", responseJson.data.user.id);
    console.log("Token设置成功:", responseJson.data.token);
}
```

### 2. 设置全局认证

在Collection级别设置Authorization：
- Type: `Bearer Token`
- Token: `{{authToken}}`

## 📊 测试数据准备

### 1. 完善用户档案

#### 更新用户技能和兴趣
```http
PUT {{baseUrl}}/api/{{apiVersion}}/users/profile
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "skills": ["JavaScript", "Python", "架构设计", "团队管理"],
  "interests": ["人工智能", "云计算", "创业"],
  "business_goals": ["技术创新", "团队建设", "商业合作"]
}
```

### 2. 设置匹配偏好

```http
POST {{baseUrl}}/api/{{apiVersion}}/users/matching-preferences
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "target_positions": ["CEO", "创始人", "投资人"],
  "target_industries": ["科技", "金融科技"],
  "company_size_preference": ["ENTERPRISE"],
  "experience_level_preference": ["EXECUTIVE", "SENIOR"],
  "business_goal_alignment": ["融资", "合作", "创新"],
  "geographic_preference": ["北京", "上海"]
}
```

### 3. 创建测试会议

```http
POST {{baseUrl}}/api/{{apiVersion}}/events
Authorization: Bearer {{authToken}}
Content-Type: application/json

{
  "name": "2024科技创新大会",
  "description": "聚焦AI和云计算的技术交流会议",
  "start_date": "2024-12-01T09:00:00.000Z",
  "end_date": "2024-12-01T18:00:00.000Z",
  "location": "北京国家会议中心",
  "max_participants": 100
}
```

**Post-response Script:**
```javascript
if (pm.response.code === 201) {
    const responseJson = pm.response.json();
    pm.environment.set("eventId", responseJson.data.event.id);
    pm.environment.set("eventCode", responseJson.data.event.event_code);
    console.log("Event ID设置成功:", responseJson.data.event.id);
}
```

### 4. 用户2加入会议

先用用户2登录，然后加入会议：

```http
POST {{baseUrl}}/api/{{apiVersion}}/events/{{eventCode}}/join
Authorization: Bearer {{authToken}}
Content-Type: application/json
```

## 🧪 API测试步骤

### 1. 基础匹配推荐API

#### 简单推荐请求
```http
GET {{baseUrl}}/api/{{apiVersion}}/matching/recommendations/{{eventId}}
Authorization: Bearer {{authToken}}
```

#### 高级推荐配置
```http
GET {{baseUrl}}/api/{{apiVersion}}/matching/recommendations/{{eventId}}?limit=10&sort=PREFERENCE_FIRST&minScore=60&diversity=0.8&preferenceOnly=true&includePartial=true
Authorization: Bearer {{authToken}}
```

**测试断言:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has success true", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.success).to.eql(true);
});

pm.test("Recommendations array exists", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.data.recommendations).to.be.an('array');
});

pm.test("Each recommendation has required fields", function () {
    const jsonData = pm.response.json();
    if (jsonData.data.recommendations.length > 0) {
        const rec = jsonData.data.recommendations[0];
        pm.expect(rec).to.have.property('target_user');
        pm.expect(rec).to.have.property('match_score');
        pm.expect(rec).to.have.property('recommendation_strength');
        pm.expect(rec).to.have.property('match_reasons');
        pm.expect(rec.match_score).to.be.at.least(0).and.at.most(100);
        
        // 保存targetUserId用于后续测试
        pm.environment.set("targetUserId", rec.target_user.id);
    }
});
```

### 2. 偏好分类推荐API

#### 基础偏好推荐
```http
GET {{baseUrl}}/api/{{apiVersion}}/matching/preferences/{{eventId}}
Authorization: Bearer {{authToken}}
```

#### 严格模式推荐
```http
GET {{baseUrl}}/api/{{apiVersion}}/matching/preferences/{{eventId}}?strict=true
Authorization: Bearer {{authToken}}
```

**测试断言:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Has perfect, partial, alternative categories", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.data).to.have.property('perfect');
    pm.expect(jsonData.data).to.have.property('partial');
    pm.expect(jsonData.data).to.have.property('alternative');
    pm.expect(jsonData.data).to.have.property('summary');
});

pm.test("Summary has correct counts", function () {
    const jsonData = pm.response.json();
    const summary = jsonData.data.summary;
    const total = summary.perfectCount + summary.partialCount + summary.alternativeCount;
    pm.expect(summary.total).to.eql(total);
});
```

### 3. 匹配历史记录API

#### 特定会议历史
```http
GET {{baseUrl}}/api/{{apiVersion}}/matching/history/{{eventId}}
Authorization: Bearer {{authToken}}
```

#### 全部历史记录
```http
GET {{baseUrl}}/api/{{apiVersion}}/matching/history
Authorization: Bearer {{authToken}}
```

#### 过滤历史记录
```http
GET {{baseUrl}}/api/{{apiVersion}}/matching/history/{{eventId}}?limit=20&minScore=70&strength=HIGH&includePast=true
Authorization: Bearer {{authToken}}
```

**测试断言:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Has history and statistics", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.data).to.have.property('history');
    pm.expect(jsonData.data).to.have.property('statistics');
    pm.expect(jsonData.data.history).to.be.an('array');
});

pm.test("Statistics has required fields", function () {
    const jsonData = pm.response.json();
    const stats = jsonData.data.statistics;
    pm.expect(stats).to.have.property('totalMatches');
    pm.expect(stats).to.have.property('averageScore');
    pm.expect(stats).to.have.property('highQualityMatches');
    pm.expect(stats).to.have.property('topRecommendationStrength');
});
```

### 4. 匹配统计信息API

```http
GET {{baseUrl}}/api/{{apiVersion}}/matching/stats/{{eventId}}
Authorization: Bearer {{authToken}}
```

**测试断言:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Statistics structure is correct", function () {
    const jsonData = pm.response.json();
    const stats = jsonData.data.statistics;
    
    pm.expect(stats).to.have.property('totalMatches');
    pm.expect(stats).to.have.property('averageScore');
    pm.expect(stats).to.have.property('highQualityMatches');
    pm.expect(stats).to.have.property('participantStats');
    pm.expect(stats).to.have.property('scoreDistribution');
    
    pm.expect(stats.participantStats).to.have.property('totalParticipants');
    pm.expect(stats.participantStats).to.have.property('activeMatchers');
    pm.expect(stats.participantStats).to.have.property('averageMatchesPerUser');
    
    pm.expect(stats.scoreDistribution).to.have.property('high');
    pm.expect(stats.scoreDistribution).to.have.property('medium');
    pm.expect(stats.scoreDistribution).to.have.property('low');
});
```

### 5. 详细匹配分析API

```http
GET {{baseUrl}}/api/{{apiVersion}}/matching/score/{{eventId}}/{{targetUserId}}
Authorization: Bearer {{authToken}}
```

**测试断言:**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Match details structure is correct", function () {
    const jsonData = pm.response.json();
    const details = jsonData.data.matchDetails;
    
    pm.expect(details).to.have.property('matchScore');
    pm.expect(details).to.have.property('recommendationStrength');
    pm.expect(details).to.have.property('matchReasons');
    pm.expect(details).to.have.property('commonInterests');
    pm.expect(details).to.have.property('businessSynergies');
    pm.expect(details).to.have.property('partialMatch');
    
    pm.expect(details.matchScore).to.be.at.least(0).and.at.most(100);
    pm.expect(['HIGH', 'MEDIUM', 'LOW']).to.include(details.recommendationStrength);
    pm.expect(details.matchReasons).to.be.an('array');
});

pm.test("Target user info is present", function () {
    const jsonData = pm.response.json();
    const targetUser = jsonData.data.targetUser;
    
    pm.expect(targetUser).to.have.property('id');
    pm.expect(targetUser).to.have.property('name');
    pm.expect(targetUser).to.have.property('position');
    pm.expect(targetUser).to.have.property('company');
});
```

## 🎯 测试场景

### 场景1：完整用户流程测试

创建一个Collection并按以下顺序执行：

1. **用户注册** → 设置userId
2. **用户登录** → 设置authToken  
3. **完善档案** → 更新技能兴趣
4. **设置偏好** → 配置匹配偏好
5. **创建会议** → 设置eventId
6. **加入会议** → 其他用户加入
7. **获取推荐** → 基础匹配推荐
8. **偏好推荐** → 分类推荐
9. **查看历史** → 匹配历史记录
10. **统计分析** → 会议统计信息
11. **详细分析** → 特定用户匹配

### 场景2：错误处理测试

#### 未认证访问
```http
GET {{baseUrl}}/api/{{apiVersion}}/matching/recommendations/{{eventId}}
# 不设置Authorization header
```

期望结果：`401 Unauthorized`

#### 无效会议ID
```http
GET {{baseUrl}}/api/{{apiVersion}}/matching/recommendations/invalid-event-id
Authorization: Bearer {{authToken}}
```

期望结果：`400 Bad Request`

#### 无效查询参数
```http
GET {{baseUrl}}/api/{{apiVersion}}/matching/recommendations/{{eventId}}?limit=invalid&minScore=abc
Authorization: Bearer {{authToken}}
```

期望结果：`400 Bad Request`

### 场景3：性能测试

#### 大量数据请求
```http
GET {{baseUrl}}/api/{{apiVersion}}/matching/recommendations/{{eventId}}?limit=100
Authorization: Bearer {{authToken}}
```

**性能断言:**
```javascript
pm.test("Response time is less than 2000ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});
```

### 场景4：数据一致性测试

#### 验证推荐数据一致性
```javascript
// 在Tests标签中添加
pm.test("Recommendations are consistent", function () {
    const jsonData = pm.response.json();
    const recommendations = jsonData.data.recommendations;
    
    recommendations.forEach(rec => {
        // 验证分数范围
        pm.expect(rec.match_score).to.be.at.least(0).and.at.most(100);
        
        // 验证推荐强度与分数对应
        if (rec.match_score >= 80) {
            pm.expect(rec.recommendation_strength).to.be.oneOf(['HIGH', 'MEDIUM']);
        }
        
        // 验证用户信息完整性
        pm.expect(rec.target_user.id).to.not.be.empty;
        pm.expect(rec.target_user.name).to.not.be.empty;
    });
});
```

## 🔍 故障排除

### 常见问题和解决方案

#### 1. 认证失败
**问题**: `401 Unauthorized`
**解决**: 
- 检查authToken是否正确设置
- 确认token未过期
- 重新登录获取新token

#### 2. 会议不存在
**问题**: `400 Bad Request - Event not found`
**解决**:
- 确认eventId正确
- 检查会议是否已创建
- 验证用户是否有权限访问该会议

#### 3. 无匹配结果
**问题**: 返回空的推荐列表
**解决**:
- 检查会议中是否有其他参与者
- 验证用户档案是否完整
- 降低minScore阈值
- 检查过滤条件是否过于严格

#### 4. 服务器错误
**问题**: `500 Internal Server Error`
**解决**:
- 检查服务器运行状态
- 查看服务器日志
- 验证数据库连接
- 检查请求数据格式

### 调试技巧

#### 1. 启用Console日志
在Tests中添加调试信息：
```javascript
console.log("Request URL:", pm.request.url);
console.log("Response:", pm.response.json());
console.log("Environment variables:", pm.environment.toObject());
```

#### 2. 查看响应详情
```javascript
pm.test("Debug response", function () {
    console.log("Status:", pm.response.code);
    console.log("Headers:", pm.response.headers);
    console.log("Body:", pm.response.text());
});
```

#### 3. 验证环境变量
```javascript
pm.test("Check environment", function () {
    console.log("authToken:", pm.environment.get("authToken"));
    console.log("userId:", pm.environment.get("userId"));
    console.log("eventId:", pm.environment.get("eventId"));
});
```

## 📝 Collection导出

将以下JSON保存为Postman Collection：

```json
{
  "info": {
    "name": "AI Social Matching Platform - Matching APIs",
    "description": "完整的匹配API测试集合",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "auth": {
    "type": "bearer",
    "bearer": [
      {
        "key": "token",
        "value": "{{authToken}}",
        "type": "string"
      }
    ]
  },
  "item": [
    {
      "name": "1. Authentication",
      "item": [
        {
          "name": "Register User 1",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test1@example.com\",\n  \"password\": \"password123\",\n  \"name\": \"张三\",\n  \"company\": \"阿里巴巴\",\n  \"position\": \"CTO\",\n  \"industry\": \"科技\",\n  \"bio\": \"资深技术专家\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/{{apiVersion}}/auth/register",
              "host": ["{{baseUrl}}"],
              "path": ["api", "{{apiVersion}}", "auth", "register"]
            }
          }
        },
        {
          "name": "Login User 1",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "if (pm.response.code === 200) {",
                  "    const responseJson = pm.response.json();",
                  "    pm.environment.set(\"authToken\", responseJson.data.token);",
                  "    pm.environment.set(\"userId\", responseJson.data.user.id);",
                  "    console.log(\"Token设置成功:\", responseJson.data.token);",
                  "}"
                ]
              }
            }
          ],
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"email\": \"test1@example.com\",\n  \"password\": \"password123\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/{{apiVersion}}/auth/login",
              "host": ["{{baseUrl}}"],
              "path": ["api", "{{apiVersion}}", "auth", "login"]
            }
          }
        }
      ]
    },
    {
      "name": "2. Matching APIs",
      "item": [
        {
          "name": "Get Basic Recommendations",
          "event": [
            {
              "listen": "test",
              "script": {
                "exec": [
                  "pm.test(\"Status code is 200\", function () {",
                  "    pm.response.to.have.status(200);",
                  "});",
                  "",
                  "pm.test(\"Response has success true\", function () {",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.success).to.eql(true);",
                  "});",
                  "",
                  "pm.test(\"Recommendations array exists\", function () {",
                  "    const jsonData = pm.response.json();",
                  "    pm.expect(jsonData.data.recommendations).to.be.an('array');",
                  "});"
                ]
              }
            }
          ],
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/api/{{apiVersion}}/matching/recommendations/{{eventId}}",
              "host": ["{{baseUrl}}"],
              "path": ["api", "{{apiVersion}}", "matching", "recommendations", "{{eventId}}"]
            }
          }
        },
        {
          "name": "Get Preference-based Recommendations", 
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/api/{{apiVersion}}/matching/preferences/{{eventId}}",
              "host": ["{{baseUrl}}"],
              "path": ["api", "{{apiVersion}}", "matching", "preferences", "{{eventId}}"]
            }
          }
        },
        {
          "name": "Get Match History",
          "request": {
            "method": "GET", 
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/api/{{apiVersion}}/matching/history/{{eventId}}",
              "host": ["{{baseUrl}}"],
              "path": ["api", "{{apiVersion}}", "matching", "history", "{{eventId}}"]
            }
          }
        },
        {
          "name": "Get Match Statistics",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/api/{{apiVersion}}/matching/stats/{{eventId}}",
              "host": ["{{baseUrl}}"],
              "path": ["api", "{{apiVersion}}", "matching", "stats", "{{eventId}}"]
            }
          }
        }
      ]
    }
  ]
}
```

## 🚀 快速开始

1. **导入Collection**: 将上述JSON导入Postman
2. **设置环境**: 创建环境并配置baseUrl
3. **启动服务器**: 确保开发服务器运行在localhost:3000
4. **运行测试**: 按顺序执行Collection中的请求
5. **查看结果**: 检查响应数据和测试断言结果

通过这个详细的测试指南，您可以全面验证匹配API的功能和性能！ 