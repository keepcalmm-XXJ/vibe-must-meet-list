import request from 'supertest';
import { app } from '../../src/server';

describe('Matching API Integration Tests', () => {
  let authToken: string;
  let testUserId: string;
  let testEventId: string;
  let secondUserId: string;

  beforeEach(async () => {
    // 创建测试用户1
    const user1Response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test1@example.com',
        password: 'password123',
        name: '张三',
        company: '阿里巴巴',
        position: 'CTO',
        industry: '科技',
        bio: '资深技术专家'
      });

    testUserId = user1Response.body.data.user.id;

    // 登录获取token
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test1@example.com',
        password: 'password123'
      });

    authToken = loginResponse.body.data.token;

    // 创建测试用户2
    const user2Response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test2@example.com',
        password: 'password123',
        name: '李四',
        company: '腾讯',
        position: 'CEO',
        industry: '科技',
        bio: '互联网创业者'
      });

    secondUserId = user2Response.body.data.user.id;

    // 更新用户档案，添加技能和兴趣
    await request(app)
      .put('/api/v1/users/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        skills: ['JavaScript', 'Python', '架构设计', '团队管理'],
        interests: ['人工智能', '云计算', '创业'],
        business_goals: ['技术创新', '团队建设', '商业合作']
      });

    // 设置匹配偏好
    await request(app)
      .post('/api/v1/users/matching-preferences')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        target_positions: ['CEO', '创始人', '投资人'],
        target_industries: ['科技', '金融科技'],
        company_size_preference: ['ENTERPRISE'],
        experience_level_preference: ['EXECUTIVE', 'SENIOR'],
        business_goal_alignment: ['融资', '合作', '创新'],
        geographic_preference: ['北京', '上海']
      });

    // 创建测试会议
    const eventResponse = await request(app)
      .post('/api/v1/events')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: '2024科技创新大会',
        description: '聚焦AI和云计算的技术交流会议',
        start_date: new Date(Date.now() + 86400000).toISOString(), // 明天
        end_date: new Date(Date.now() + 172800000).toISOString(),   // 后天
        location: '北京国家会议中心',
        max_participants: 100
      });

    testEventId = eventResponse.body.data.event.id;

    // 第二个用户加入会议
    const loginResponse2 = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'test2@example.com',
        password: 'password123'
      });

    await request(app)
      .post(`/api/v1/events/${eventResponse.body.data.event.event_code}/join`)
      .set('Authorization', `Bearer ${loginResponse2.body.data.token}`);
  });

  describe('GET /api/v1/matching/recommendations/:eventId', () => {
    it('应该返回基础匹配推荐', async () => {
      const response = await request(app)
        .get(`/api/v1/matching/recommendations/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('recommendations');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('eventId', testEventId);
      expect(response.body.data).toHaveProperty('userId', testUserId);
      expect(Array.isArray(response.body.data.recommendations)).toBe(true);
    });

    it('应该支持排序策略参数', async () => {
      const response = await request(app)
        .get(`/api/v1/matching/recommendations/${testEventId}`)
        .query({
          sort: 'PREFERENCE_FIRST',
          limit: '5',
          minScore: '50'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.sortStrategy).toBe('PREFERENCE_FIRST');
      expect(response.body.data.recommendations.length).toBeLessThanOrEqual(5);
    });

    it('应该支持多样性过滤', async () => {
      const response = await request(app)
        .get(`/api/v1/matching/recommendations/${testEventId}`)
        .query({
          diversity: '0.8',
          preferenceOnly: 'true'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.filters).toHaveProperty('diversityFactor', 0.8);
      expect(response.body.data.filters).toHaveProperty('preferenceMatchOnly', true);
    });

    it('应该返回详细的匹配信息', async () => {
      const response = await request(app)
        .get(`/api/v1/matching/recommendations/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.data.recommendations.length > 0) {
        const match = response.body.data.recommendations[0];
        expect(match).toHaveProperty('target_user');
        expect(match).toHaveProperty('match_score');
        expect(match).toHaveProperty('recommendation_strength');
        expect(match).toHaveProperty('match_reasons');
        expect(match).toHaveProperty('common_interests');
        expect(match).toHaveProperty('business_synergies');
        
        expect(match.target_user).toHaveProperty('id');
        expect(match.target_user).toHaveProperty('name');
        expect(match.target_user).toHaveProperty('position');
        expect(match.target_user).toHaveProperty('company');
        expect(match.target_user).toHaveProperty('industry');
        
        expect(typeof match.match_score).toBe('number');
        expect(match.match_score).toBeGreaterThanOrEqual(0);
        expect(match.match_score).toBeLessThanOrEqual(100);
        
        expect(['HIGH', 'MEDIUM', 'LOW']).toContain(match.recommendation_strength);
        expect(Array.isArray(match.match_reasons)).toBe(true);
        expect(Array.isArray(match.common_interests)).toBe(true);
        expect(Array.isArray(match.business_synergies)).toBe(true);
      }
    });

    it('应该拒绝未认证的请求', async () => {
      await request(app)
        .get(`/api/v1/matching/recommendations/${testEventId}`)
        .expect(401);
    });
  });

  describe('GET /api/v1/matching/preferences/:eventId', () => {
    it('应该返回基于偏好的分类推荐', async () => {
      const response = await request(app)
        .get(`/api/v1/matching/preferences/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('perfect');
      expect(response.body.data).toHaveProperty('partial');
      expect(response.body.data).toHaveProperty('alternative');
      expect(response.body.data).toHaveProperty('summary');
      
      expect(Array.isArray(response.body.data.perfect)).toBe(true);
      expect(Array.isArray(response.body.data.partial)).toBe(true);
      expect(Array.isArray(response.body.data.alternative)).toBe(true);
      
      expect(response.body.data.summary).toHaveProperty('perfectCount');
      expect(response.body.data.summary).toHaveProperty('partialCount');
      expect(response.body.data.summary).toHaveProperty('alternativeCount');
      expect(response.body.data.summary).toHaveProperty('total');
    });

    it('应该支持严格模式', async () => {
      const response = await request(app)
        .get(`/api/v1/matching/preferences/${testEventId}`)
        .query({ strict: 'true' })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.strictMode).toBe(true);
    });
  });

  describe('GET /api/v1/matching/history/:eventId?', () => {
    beforeEach(async () => {
      // 先生成一些匹配历史
      await request(app)
        .get(`/api/v1/matching/recommendations/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('应该返回特定会议的匹配历史', async () => {
      const response = await request(app)
        .get(`/api/v1/matching/history/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('eventId', testEventId);
      expect(response.body.data).toHaveProperty('userId', testUserId);
      expect(response.body.data).toHaveProperty('history');
      expect(response.body.data).toHaveProperty('statistics');
      
      expect(Array.isArray(response.body.data.history)).toBe(true);
      expect(response.body.data.statistics).toHaveProperty('totalMatches');
      expect(response.body.data.statistics).toHaveProperty('averageScore');
      expect(response.body.data.statistics).toHaveProperty('highQualityMatches');
      expect(response.body.data.statistics).toHaveProperty('topRecommendationStrength');
    });

    it('应该返回所有会议的匹配历史', async () => {
      const response = await request(app)
        .get('/api/v1/matching/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.eventId).toBe(null);
      expect(response.body.data).toHaveProperty('history');
      expect(response.body.data).toHaveProperty('statistics');
    });

    it('应该支持过滤参数', async () => {
      const response = await request(app)
        .get(`/api/v1/matching/history/${testEventId}`)
        .query({
          limit: '10',
          minScore: '60',
          strength: 'HIGH'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.filters).toHaveProperty('limit', 10);
      expect(response.body.data.filters).toHaveProperty('minScore', 60);
      expect(response.body.data.filters).toHaveProperty('strengthFilter', ['HIGH']);
    });
  });

  describe('GET /api/v1/matching/stats/:eventId', () => {
    beforeEach(async () => {
      // 生成一些匹配数据
      await request(app)
        .get(`/api/v1/matching/recommendations/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('应该返回会议匹配统计信息', async () => {
      const response = await request(app)
        .get(`/api/v1/matching/stats/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('eventId', testEventId);
      expect(response.body.data).toHaveProperty('statistics');
      
      const stats = response.body.data.statistics;
      expect(stats).toHaveProperty('totalMatches');
      expect(stats).toHaveProperty('averageScore');
      expect(stats).toHaveProperty('highQualityMatches');
      expect(stats).toHaveProperty('participantStats');
      expect(stats).toHaveProperty('scoreDistribution');
      
      expect(stats.participantStats).toHaveProperty('totalParticipants');
      expect(stats.participantStats).toHaveProperty('activeMatchers');
      expect(stats.participantStats).toHaveProperty('averageMatchesPerUser');
      
      expect(stats.scoreDistribution).toHaveProperty('high');
      expect(stats.scoreDistribution).toHaveProperty('medium');
      expect(stats.scoreDistribution).toHaveProperty('low');
    });
  });

  describe('GET /api/v1/matching/score/:eventId/:targetUserId', () => {
    beforeEach(async () => {
      // 确保有匹配数据
      await request(app)
        .get(`/api/v1/matching/recommendations/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`);
    });

    it('应该返回特定用户间的匹配详情', async () => {
      const response = await request(app)
        .get(`/api/v1/matching/score/${testEventId}/${secondUserId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('eventId', testEventId);
      expect(response.body.data).toHaveProperty('userId', testUserId);
      expect(response.body.data).toHaveProperty('targetUserId', secondUserId);
      expect(response.body.data).toHaveProperty('matchDetails');
      expect(response.body.data).toHaveProperty('targetUser');
      
      const details = response.body.data.matchDetails;
      expect(details).toHaveProperty('matchScore');
      expect(details).toHaveProperty('recommendationStrength');
      expect(details).toHaveProperty('matchReasons');
      expect(details).toHaveProperty('commonInterests');
      expect(details).toHaveProperty('businessSynergies');
      expect(details).toHaveProperty('partialMatch');
      
      expect(typeof details.matchScore).toBe('number');
      expect(['HIGH', 'MEDIUM', 'LOW']).toContain(details.recommendationStrength);
      expect(Array.isArray(details.matchReasons)).toBe(true);
    });

    it('应该返回404当目标用户不在会议中', async () => {
      const response = await request(app)
        .get(`/api/v1/matching/score/${testEventId}/nonexistent-user`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);

      expect(response.body.error.code).toBe('MATCH_NOT_FOUND');
    });
  });

  describe('错误处理', () => {
    it('应该处理不存在的会议ID', async () => {
      const response = await request(app)
        .get('/api/v1/matching/recommendations/nonexistent-event')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('MATCHING_ERROR');
    });

    it('应该验证查询参数', async () => {
      const response = await request(app)
        .get(`/api/v1/matching/recommendations/${testEventId}`)
        .query({
          limit: 'invalid',
          minScore: 'invalid'
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error.code).toBe('MATCHING_ERROR');
    });
  });

  describe('匹配原因说明', () => {
    it('应该包含详细的中文匹配原因', async () => {
      const response = await request(app)
        .get(`/api/v1/matching/recommendations/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      if (response.body.data.recommendations.length > 0) {
        const match = response.body.data.recommendations[0];
        
        if (match.match_reasons.length > 0) {
          const reason = match.match_reasons[0];
          expect(reason).toHaveProperty('type');
          expect(reason).toHaveProperty('description');
          expect(reason).toHaveProperty('score');
          
          expect(['INDUSTRY', 'POSITION', 'SKILLS', 'BUSINESS_GOALS', 'EXPERIENCE', 'COMPANY_SIZE'])
            .toContain(reason.type);
          expect(typeof reason.description).toBe('string');
          expect(reason.description.length).toBeGreaterThan(0);
          expect(typeof reason.score).toBe('number');
          expect(reason.score).toBeGreaterThanOrEqual(0);
          expect(reason.score).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe('部分匹配处理', () => {
    it('应该包含部分匹配信息', async () => {
      const response = await request(app)
        .get(`/api/v1/matching/preferences/${testEventId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const allMatches = [
        ...response.body.data.perfect,
        ...response.body.data.partial,
        ...response.body.data.alternative
      ];

      if (allMatches.length > 0) {
        const match = allMatches[0];
        if (match.partial_match) {
          expect(match.partial_match).toHaveProperty('matchedCriteria');
          expect(match.partial_match).toHaveProperty('missedCriteria');
          expect(match.partial_match).toHaveProperty('matchPercentage');
          expect(match.partial_match).toHaveProperty('explanation');
          
          expect(Array.isArray(match.partial_match.matchedCriteria)).toBe(true);
          expect(Array.isArray(match.partial_match.missedCriteria)).toBe(true);
          expect(typeof match.partial_match.matchPercentage).toBe('number');
          expect(match.partial_match.matchPercentage).toBeGreaterThanOrEqual(0);
          expect(match.partial_match.matchPercentage).toBeLessThanOrEqual(100);
          expect(typeof match.partial_match.explanation).toBe('string');
        }
      }
    });
  });
}); 