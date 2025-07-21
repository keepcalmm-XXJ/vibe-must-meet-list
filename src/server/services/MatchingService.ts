import { Database } from 'sqlite';
import { UserProfile } from '../../shared/types/User';
import { MatchingPreferences, MatchResult, MatchReason, RecommendationStrength, CompanySize, ExperienceLevel, Match } from '../../shared/types/Matching';
import { UserService } from './UserService';
import { MatchingPreferencesService } from './MatchingPreferencesService';
import { EventService } from './EventService';
import { MatchingRepository } from '../database/repositories/MatchingRepository';
import { FeedbackLearningRepository } from '../database/repositories/FeedbackLearningRepository';

/**
 * 多维度匹配评分系统
 */
export interface MatchingDimensions {
  industryAlignment: number;        // 行业匹配度 (0-1)
  positionComplementarity: number;  // 职位互补性 (0-1)  
  businessGoalSynergy: number;      // 商业目标协同性 (0-1)
  skillsRelevance: number;          // 技能相关性 (0-1)
  experienceLevel: number;          // 经验水平匹配 (0-1)
  companySizeAlignment: number;     // 公司规模匹配 (0-1)
  userPreferenceMatch: number;      // 用户偏好匹配 (0-1)
}

/**
 * 权重配置系统
 */
export interface MatchingWeights {
  industryWeight: number;       // 行业权重 (默认 0.25)
  positionWeight: number;       // 职位权重 (默认 0.20)
  businessGoalWeight: number;   // 商业目标权重 (默认 0.20)
  skillsWeight: number;         // 技能权重 (默认 0.15)
  experienceWeight: number;     // 经验权重 (默认 0.10)
  companySizeWeight: number;    // 公司规模权重 (默认 0.05)
  userPreferenceWeight: number; // 用户偏好权重 (默认 0.05)
}

/**
 * 排序策略枚举
 */
export type SortStrategy = 'SCORE_DESC' | 'PREFERENCE_FIRST' | 'DIVERSITY' | 'BALANCED';

/**
 * 过滤选项
 */
export interface FilterOptions {
  minScore?: number;              // 最低匹配分数
  excludeConnected?: boolean;     // 排除已连接用户
  onlineOnly?: boolean;          // 仅在线用户
  preferenceMatchOnly?: boolean;  // 仅符合偏好的用户
  diversityFactor?: number;      // 多样性因子 (0-1)
}

/**
 * 部分匹配信息
 */
export interface PartialMatch {
  matchedCriteria: string[];     // 匹配的条件
  missedCriteria: string[];      // 未匹配的条件
  matchPercentage: number;       // 匹配百分比
  explanation: string;           // 匹配说明
}

export class MatchingService {
  private userService: UserService;
  private preferencesService: MatchingPreferencesService;
  private eventService: EventService;
  private matchingRepository: MatchingRepository;
  private feedbackRepository: FeedbackLearningRepository;

  // 默认权重配置
  private defaultWeights: MatchingWeights = {
    industryWeight: 0.25,
    positionWeight: 0.20,
    businessGoalWeight: 0.20,
    skillsWeight: 0.15,
    experienceWeight: 0.10,
    companySizeWeight: 0.05,
    userPreferenceWeight: 0.05
  };

  constructor(db?: Database) {
    this.userService = new UserService(db);
    this.preferencesService = new MatchingPreferencesService(db);
    this.eventService = new EventService();
    this.matchingRepository = new MatchingRepository();
    this.feedbackRepository = new FeedbackLearningRepository();
  }

  /**
   * 生成用户在指定会议中的匹配推荐 - 增强版
   */
  async generateMatches(
    userId: string, 
    eventId: string, 
    options: {
      limit?: number;
      sortStrategy?: SortStrategy;
      filterOptions?: FilterOptions;
      includePartialMatches?: boolean;
      saveToHistory?: boolean; // 新增：是否保存到历史记录
    } = {}
  ): Promise<MatchResult[]> {
    const { 
      limit = 10, 
      sortStrategy = 'BALANCED', 
      filterOptions = {}, 
      includePartialMatches = true,
      saveToHistory = true // 默认保存到历史记录
    } = options;

    // 获取当前用户的档案和偏好
    const currentUser = await this.userService.getProfile(userId);
    if (!currentUser) {
      throw new Error('User not found');
    }

    const userPreferences = await this.preferencesService.getPreferences(userId);

    // 检查并初始化冷启动档案（如果需要）
    await this.ensureColdStartProfile(userId);

    // 获取会议中的其他参与者
    const participants = await this.eventService.getEventParticipants(eventId, userId);
    const otherParticipants = participants.filter(p => p.id !== userId);

    // 计算每个参与者的匹配分数
    let matchResults: MatchResult[] = [];

    for (const participant of otherParticipants) {
      const participantProfile = await this.userService.getProfile(participant.id);
      if (!participantProfile) continue;

      const matchScore = await this.calculateMatchScore(currentUser, participantProfile, userPreferences);
      const matchReasons = this.generateMatchReasons(currentUser, participantProfile);
      const commonInterests = this.findCommonElements(currentUser.interests, participantProfile.interests);
      const businessSynergies = this.findBusinessSynergies(currentUser.business_goals, participantProfile.business_goals);
      const partialMatch = userPreferences ? 
        this.calculatePartialMatch(participantProfile, userPreferences) : null;

      const result: MatchResult = {
        target_user: participantProfile,
        match_score: Math.round(matchScore * 100), // 转换为百分制
        match_reasons: matchReasons,
        common_interests: commonInterests,
        business_synergies: businessSynergies,
        recommendation_strength: this.getRecommendationStrength(matchScore),
        // 添加部分匹配信息
        partial_match: partialMatch || undefined
      };

      matchResults.push(result);

      // 保存到匹配历史记录
      if (saveToHistory) {
        await this.saveMatchToHistory(userId, eventId, result);
      }
    }

    // 应用过滤器
    matchResults = this.applyFilters(matchResults, filterOptions, userPreferences);

    // 应用排序策略
    matchResults = this.applySortStrategy(matchResults, sortStrategy, userPreferences);

    // 应用个性化优化
    matchResults = await this.applyPersonalizationOptimization(userId, matchResults);

    // 确保多样性
    if (filterOptions.diversityFactor && filterOptions.diversityFactor > 0) {
      matchResults = this.ensureDiversity(matchResults, filterOptions.diversityFactor);
    }

    // 处理部分匹配
    if (!includePartialMatches && userPreferences) {
      matchResults = matchResults.filter(result => 
        result.partial_match?.matchPercentage && result.partial_match.matchPercentage >= 50 // 至少50%匹配
      );
    }

    return matchResults.slice(0, limit);
  }

  /**
   * 计算两个用户之间的总匹配分数
   */
  async calculateMatchScore(
    user1: UserProfile, 
    user2: UserProfile, 
    preferences?: MatchingPreferences | null,
    weights?: MatchingWeights
  ): Promise<number> {
    // 优先使用传入的权重，然后是用户个性化权重，最后是默认权重
    let usedWeights = weights;
    
    if (!usedWeights) {
      // 尝试获取用户个性化权重
      const personalizedWeights = await this.feedbackRepository.getUserPreferenceWeights(user1.id);
      if (personalizedWeights) {
        usedWeights = {
          industryWeight: personalizedWeights.industry_weight,
          positionWeight: personalizedWeights.position_weight,
          businessGoalWeight: personalizedWeights.business_goal_weight,
          skillsWeight: personalizedWeights.skills_weight,
          experienceWeight: personalizedWeights.experience_weight,
          companySizeWeight: personalizedWeights.company_size_weight,
          userPreferenceWeight: personalizedWeights.user_preference_weight
        };
      } else {
        usedWeights = this.defaultWeights;
      }
    }
    
    // 计算各维度分数
    const dimensions = await this.calculateMatchingDimensions(user1, user2, preferences);
    
    // 计算加权总分
    const totalScore = 
      dimensions.industryAlignment * usedWeights.industryWeight +
      dimensions.positionComplementarity * usedWeights.positionWeight +
      dimensions.businessGoalSynergy * usedWeights.businessGoalWeight +
      dimensions.skillsRelevance * usedWeights.skillsWeight +
      dimensions.experienceLevel * usedWeights.experienceWeight +
      dimensions.companySizeAlignment * usedWeights.companySizeWeight +
      dimensions.userPreferenceMatch * usedWeights.userPreferenceWeight;

    return Math.min(1.0, Math.max(0.0, totalScore)); // 确保分数在 0-1 范围内
  }

  /**
   * 计算多维度匹配分数
   */
  private async calculateMatchingDimensions(
    user1: UserProfile,
    user2: UserProfile,
    preferences?: MatchingPreferences | null
  ): Promise<MatchingDimensions> {
    return {
      industryAlignment: this.calculateIndustryAlignment(user1.industry, user2.industry),
      positionComplementarity: this.calculatePositionComplementarity(user1.position, user2.position),
      businessGoalSynergy: this.calculateBusinessGoalSynergy(user1.business_goals, user2.business_goals),
      skillsRelevance: this.calculateSkillsRelevance(user1.skills, user2.skills),
      experienceLevel: this.calculateExperienceLevel(user1.position, user2.position),
      companySizeAlignment: this.calculateCompanySizeAlignment(user1.company, user2.company),
      userPreferenceMatch: preferences ? this.calculateUserPreferenceMatch(user2, preferences) : 0.5
    };
  }

  /**
   * 计算行业匹配度
   * 完全匹配：1.0分，相关行业：0.7分，互补行业：0.5分，无关行业：0.1分
   */
  private calculateIndustryAlignment(industry1?: string, industry2?: string): number {
    if (!industry1 || !industry2) return 0.1;

    const industry1Lower = industry1.toLowerCase();
    const industry2Lower = industry2.toLowerCase();

    // 完全匹配
    if (industry1Lower === industry2Lower) {
      return 1.0;
    }

    // 相关行业映射
    const relatedIndustries: { [key: string]: string[] } = {
      '科技': ['软件开发', '人工智能', '大数据', '云计算', '物联网', '区块链'],
      '金融': ['金融科技', '银行', '保险', '投资', '风投'],
      '医疗': ['生物技术', '制药', '医疗设备', '健康科技'],
      '教育': ['在线教育', '培训', '企业培训', '学习平台'],
      '制造': ['工业4.0', '智能制造', '供应链', '物流'],
      '零售': ['电商', '新零售', '消费品', '品牌营销'],
      '房地产': ['建筑', '城市规划', '智慧城市', '物业管理'],
      '能源': ['新能源', '清洁技术', '可持续发展', '环保']
    };

    // 检查相关行业
    for (const [mainIndustry, related] of Object.entries(relatedIndustries)) {
      const isUser1Related = industry1Lower.includes(mainIndustry.toLowerCase()) || 
                             related.some(r => industry1Lower.includes(r.toLowerCase()));
      const isUser2Related = industry2Lower.includes(mainIndustry.toLowerCase()) || 
                             related.some(r => industry2Lower.includes(r.toLowerCase()));
      
      if (isUser1Related && isUser2Related) {
        return 0.7; // 相关行业
      }
    }

    // 互补行业关系
    const complementaryPairs: [string, string][] = [
      ['制造', '供应链'],
      ['科技', '金融'],
      ['医疗', '科技'],
      ['教育', '科技'],
      ['零售', '物流'],
      ['房地产', '金融'],
      ['能源', '科技']
    ];

    for (const [ind1, ind2] of complementaryPairs) {
      const hasComplementary = 
        (industry1Lower.includes(ind1.toLowerCase()) && industry2Lower.includes(ind2.toLowerCase())) ||
        (industry1Lower.includes(ind2.toLowerCase()) && industry2Lower.includes(ind1.toLowerCase()));
      
      if (hasComplementary) {
        return 0.5; // 互补行业
      }
    }

    return 0.1; // 无关行业
  }

  /**
   * 计算职位互补性
   * 上下游关系：1.0分，同级别不同领域：0.8分，同职位不同行业：0.6分，其他：0.3分
   */
  private calculatePositionComplementarity(position1?: string, position2?: string): number {
    if (!position1 || !position2) return 0.3;

    const pos1Lower = position1.toLowerCase();
    const pos2Lower = position2.toLowerCase();

    // 完全匹配（同职位）- 根据行业差异给分
    if (pos1Lower === pos2Lower) {
      return 0.6; // 同职位不同行业
    }

    // 上下游关系定义
    const upstreamDownstream: { [key: string]: string[] } = {
      'ceo': ['cfo', 'cto', 'cmo', '投资人', '董事', '合伙人'],
      '投资人': ['ceo', '创始人', '企业家', '董事长'],
      'cto': ['技术总监', '研发总监', '架构师', '工程师'],
      'cmo': ['市场总监', '品牌总监', '营销总监', '销售总监'],
      'cfo': ['财务总监', '会计', '风控', '投资总监'],
      '产品经理': ['设计师', '工程师', '运营', '市场'],
      '销售总监': ['客户经理', '商务', '市场', '运营'],
      '人力资源': ['招聘', '培训', '组织发展', '企业文化']
    };

    // 检查上下游关系
    for (const [upstream, downstreamList] of Object.entries(upstreamDownstream)) {
      const isUpstreamRelation = 
        (pos1Lower.includes(upstream) && downstreamList.some(d => pos2Lower.includes(d.toLowerCase()))) ||
        (pos2Lower.includes(upstream) && downstreamList.some(d => pos1Lower.includes(d.toLowerCase())));
      
      if (isUpstreamRelation) {
        return 1.0; // 上下游关系
      }
    }

    // 同级别不同领域
    const executiveLevel = ['ceo', 'cto', 'cfo', 'cmo', '总监', '副总裁', 'vp'];
    const managerLevel = ['总监', '经理', '主管', '负责人'];
    const specialistLevel = ['专家', '工程师', '设计师', '分析师', '顾问'];

    const isUser1Executive = executiveLevel.some(level => pos1Lower.includes(level));
    const isUser2Executive = executiveLevel.some(level => pos2Lower.includes(level));
    
    const isUser1Manager = managerLevel.some(level => pos1Lower.includes(level));
    const isUser2Manager = managerLevel.some(level => pos2Lower.includes(level));
    
    const isUser1Specialist = specialistLevel.some(level => pos1Lower.includes(level));
    const isUser2Specialist = specialistLevel.some(level => pos2Lower.includes(level));

    if ((isUser1Executive && isUser2Executive) || 
        (isUser1Manager && isUser2Manager) || 
        (isUser1Specialist && isUser2Specialist)) {
      return 0.8; // 同级别不同领域
    }

    return 0.3; // 其他情况
  }

  /**
   * 计算商业目标协同性
   * 完全匹配：1.0分，部分重叠：0.7分，目标互补：0.5分，无关：0.2分
   */
  private calculateBusinessGoalSynergy(goals1: string[], goals2: string[]): number {
    if (!goals1?.length || !goals2?.length) return 0.2;

    // 标准化目标文本
    const normalizedGoals1 = goals1.map(g => g.toLowerCase().trim());
    const normalizedGoals2 = goals2.map(g => g.toLowerCase().trim());

    // 计算完全匹配的目标
    const exactMatches = normalizedGoals1.filter(goal1 => 
      normalizedGoals2.some(goal2 => goal1 === goal2)
    );

    if (exactMatches.length > 0) {
      const matchRatio = exactMatches.length / Math.min(normalizedGoals1.length, normalizedGoals2.length);
      if (matchRatio >= 0.5) return 1.0; // 完全匹配
    }

    // 检查部分重叠（语义相似）
    const similarGoals = this.findSimilarGoals(normalizedGoals1, normalizedGoals2);
    if (similarGoals.length > 0) {
      return 0.7; // 部分重叠
    }

    // 检查互补目标
    const complementaryGoals = this.findComplementaryGoals(normalizedGoals1, normalizedGoals2);
    if (complementaryGoals.length > 0) {
      return 0.5; // 目标互补
    }

    return 0.2; // 无关
  }

  /**
   * 查找相似的商业目标
   */
  private findSimilarGoals(goals1: string[], goals2: string[]): string[] {
    const similarTerms: { [key: string]: string[] } = {
      '融资': ['投资', '资金', '股权', '风投', 'vc'],
      '合作': ['伙伴', '联盟', '协作', '共赢'],
      '扩展': ['拓展', '增长', '发展', '规模'],
      '创新': ['技术', '研发', '突破', '革新'],
      '市场': ['销售', '客户', '商业', '营销'],
      '人才': ['招聘', '团队', '人力', '专家'],
      '品牌': ['知名度', '影响力', '声誉', '形象']
    };

    const matches: string[] = [];
    
    for (const goal1 of goals1) {
      for (const goal2 of goals2) {
        // 检查直接包含关系
        if (goal1.includes(goal2) || goal2.includes(goal1)) {
          matches.push(goal1);
          continue;
        }

        // 检查语义相似性
        for (const [category, terms] of Object.entries(similarTerms)) {
          const goal1HasTerm = terms.some(term => goal1.includes(term));
          const goal2HasTerm = terms.some(term => goal2.includes(term));
          
          if (goal1HasTerm && goal2HasTerm) {
            matches.push(goal1);
            break;
          }
        }
      }
    }

    return [...new Set(matches)]; // 去重
  }

  /**
   * 查找互补的商业目标
   */
  private findComplementaryGoals(goals1: string[], goals2: string[]): string[] {
    const complementaryPairs: [string, string][] = [
      ['融资', '投资'],
      ['技术', '市场'],
      ['产品', '销售'],
      ['研发', '商业化'],
      ['创新', '规模化'],
      ['人才', '项目'],
      ['资金', '技术'],
      ['渠道', '产品']
    ];

    const matches: string[] = [];

    for (const goal1 of goals1) {
      for (const goal2 of goals2) {
        for (const [comp1, comp2] of complementaryPairs) {
          const isComplementary = 
            (goal1.includes(comp1) && goal2.includes(comp2)) ||
            (goal1.includes(comp2) && goal2.includes(comp1));
          
          if (isComplementary) {
            matches.push(goal1);
            break;
          }
        }
      }
    }

    return [...new Set(matches)];
  }

  /**
   * 计算技能相关性
   * 基于共同技能和互补技能计算相关性得分
   */
  private calculateSkillsRelevance(skills1: string[], skills2: string[]): number {
    if (!skills1?.length || !skills2?.length) return 0.2;

    const normalizedSkills1 = skills1.map(s => s.toLowerCase().trim());
    const normalizedSkills2 = skills2.map(s => s.toLowerCase().trim());

    // 计算共同技能
    const commonSkills = normalizedSkills1.filter(skill1 => 
      normalizedSkills2.some(skill2 => 
        skill1 === skill2 || skill1.includes(skill2) || skill2.includes(skill1)
      )
    );

    // 计算技能相似性
    const similarSkills = this.findSimilarSkills(normalizedSkills1, normalizedSkills2);
    
    // 计算互补技能
    const complementarySkills = this.findComplementarySkills(normalizedSkills1, normalizedSkills2);

    // 计算总的技能相关性分数
    const commonScore = Math.min(1.0, commonSkills.length * 0.3);
    const similarScore = Math.min(0.6, similarSkills.length * 0.2);
    const complementaryScore = Math.min(0.4, complementarySkills.length * 0.1);

    return Math.min(1.0, commonScore + similarScore + complementaryScore);
  }

  /**
   * 查找相似技能
   */
  private findSimilarSkills(skills1: string[], skills2: string[]): string[] {
    const skillCategories: { [key: string]: string[] } = {
      '编程': ['javascript', 'python', 'java', 'c++', 'react', 'vue', 'angular', 'node.js'],
      '数据': ['数据分析', '机器学习', 'ai', '数据挖掘', 'sql', 'tableau', 'powerbi'],
      '设计': ['ui', 'ux', '平面设计', '交互设计', 'figma', 'sketch', 'adobe'],
      '市场': ['营销', '数字营销', 'seo', 'sem', '内容营销', '社交媒体'],
      '管理': ['项目管理', '团队管理', '敏捷', 'scrum', 'pmp', '领导力'],
      '金融': ['财务', '会计', '投资', '风控', '审计', '预算'],
      '销售': ['客户关系', 'crm', 'b2b', 'b2c', '谈判', '商务拓展']
    };

    const matches: string[] = [];

    for (const skill1 of skills1) {
      for (const skill2 of skills2) {
        // 检查是否属于同一技能类别
        for (const [category, categorySkills] of Object.entries(skillCategories)) {
          const skill1InCategory = categorySkills.some(cs => skill1.includes(cs));
          const skill2InCategory = categorySkills.some(cs => skill2.includes(cs));
          
          if (skill1InCategory && skill2InCategory && skill1 !== skill2) {
            matches.push(skill1);
            break;
          }
        }
      }
    }

    return [...new Set(matches)];
  }

  /**
   * 查找互补技能
   */
  private findComplementarySkills(skills1: string[], skills2: string[]): string[] {
    const complementaryPairs: [string, string][] = [
      ['前端', '后端'],
      ['设计', '开发'],
      ['技术', '产品'],
      ['开发', '测试'],
      ['数据', '业务'],
      ['ai', '产品'],
      ['技术', '市场'],
      ['研发', '运营']
    ];

    const matches: string[] = [];

    for (const skill1 of skills1) {
      for (const skill2 of skills2) {
        for (const [comp1, comp2] of complementaryPairs) {
          const isComplementary = 
            (skill1.includes(comp1) && skill2.includes(comp2)) ||
            (skill1.includes(comp2) && skill2.includes(comp1));
          
          if (isComplementary) {
            matches.push(skill1);
            break;
          }
        }
      }
    }

    return [...new Set(matches)];
  }

  /**
   * 计算经验水平匹配度（简化实现）
   */
  private calculateExperienceLevel(position1?: string, position2?: string): number {
    if (!position1 || !position2) return 0.5;

    // 简化的经验水平映射
    const getExperienceLevel = (position: string): number => {
      const pos = position.toLowerCase();
      if (pos.includes('ceo') || pos.includes('创始人') || pos.includes('董事')) return 5;
      if (pos.includes('总监') || pos.includes('vp') || pos.includes('副总裁')) return 4;
      if (pos.includes('经理') || pos.includes('主管') || pos.includes('负责人')) return 3;
      if (pos.includes('高级') || pos.includes('资深') || pos.includes('专家')) return 2;
      return 1;
    };

    const level1 = getExperienceLevel(position1);
    const level2 = getExperienceLevel(position2);
    const levelDiff = Math.abs(level1 - level2);

    // 经验水平越接近分数越高
    return Math.max(0.3, 1.0 - (levelDiff * 0.2));
  }

  /**
   * 计算公司规模匹配度（简化实现）
   */
  private calculateCompanySizeAlignment(company1?: string, company2?: string): number {
    // 简化实现，实际应该从公司数据库获取规模信息
    return 0.6; // 默认中等匹配度
  }

  /**
   * 计算用户偏好匹配度
   */
  private calculateUserPreferenceMatch(targetUser: UserProfile, preferences: MatchingPreferences): number {
    let score = 0;
    let criteria = 0;

    // 检查目标职位匹配
    if (preferences.target_positions.length > 0) {
      criteria++;
      const positionMatch = preferences.target_positions.some(targetPos => 
        targetUser.position?.toLowerCase().includes(targetPos.toLowerCase())
      );
      if (positionMatch) score += 0.3;
    }

    // 检查目标行业匹配
    if (preferences.target_industries.length > 0) {
      criteria++;
      const industryMatch = preferences.target_industries.some(targetInd => 
        targetUser.industry?.toLowerCase().includes(targetInd.toLowerCase())
      );
      if (industryMatch) score += 0.3;
    }

    // 检查商业目标匹配
    if (preferences.business_goal_alignment.length > 0) {
      criteria++;
      const goalMatch = preferences.business_goal_alignment.some(prefGoal =>
        targetUser.business_goals.some(userGoal => 
          userGoal.toLowerCase().includes(prefGoal.toLowerCase())
        )
      );
      if (goalMatch) score += 0.4;
    }

    return criteria > 0 ? score / criteria : 0.5;
  }

  /**
   * 生成匹配原因说明
   */
  private generateMatchReasons(user1: UserProfile, user2: UserProfile): MatchReason[] {
    const reasons: MatchReason[] = [];

    // 行业匹配原因
    const industryScore = this.calculateIndustryAlignment(user1.industry, user2.industry);
    if (industryScore >= 0.7) {
      let description = '';
      if (industryScore >= 1.0) {
        description = `您们都在${user1.industry}行业工作，有共同的行业背景和理解`;
      } else if (industryScore >= 0.8) {
        description = `您的${user1.industry}行业与对方的${user2.industry}行业高度相关，易于产生合作机会`;
      } else {
        description = `您们的行业背景相关，可能存在跨领域合作的潜力`;
      }
      
      reasons.push({
        type: 'INDUSTRY',
        description,
        score: industryScore
      });
    }

    // 职位互补原因
    const positionScore = this.calculatePositionComplementarity(user1.position, user2.position);
    if (positionScore >= 0.8) {
      let description = '';
      if (positionScore >= 1.0) {
        description = `您的${user1.position}职位与对方的${user2.position}职位形成完美的上下游关系`;
      } else if (positionScore >= 0.9) {
        description = `作为${user1.position}，您与${user2.position}在战略层面可以形成很好的互补`;
      } else {
        description = `您们的职位在同一层级但不同领域，有很好的横向合作潜力`;
      }
      
      reasons.push({
        type: 'POSITION',
        description,
        score: positionScore
      });
    }

    // 技能相关原因
    const skillsScore = this.calculateSkillsRelevance(user1.skills, user2.skills);
    if (skillsScore >= 0.6) {
      const commonSkills = this.findCommonElements(user1.skills, user2.skills);
      const complementarySkills = this.findComplementarySkills(
        user1.skills.map(s => s.toLowerCase()), 
        user2.skills.map(s => s.toLowerCase())
      );
      
      let description = '';
      if (commonSkills.length > 0) {
        description = `您们在${commonSkills.slice(0, 3).join('、')}等技能方面有共同点`;
      } else if (complementarySkills.length > 0) {
        description = `您们的技能组合互补性很强，可以形成技术协同效应`;
      } else {
        description = `您们的技能背景相关，有技术交流和合作的基础`;
      }
      
      reasons.push({
        type: 'SKILLS',
        description,
        score: skillsScore
      });
    }

    // 商业目标协同原因
    const goalScore = this.calculateBusinessGoalSynergy(user1.business_goals, user2.business_goals);
    if (goalScore >= 0.7) {
      const commonGoals = this.findCommonElements(user1.business_goals, user2.business_goals);
      const synergies = this.findBusinessSynergies(user1.business_goals, user2.business_goals);
      
      let description = '';
      if (goalScore >= 1.0) {
        description = `您们的商业目标高度一致，特别是在${commonGoals.slice(0, 2).join('、')}方面`;
      } else if (commonGoals.length > 0) {
        description = `您们在${commonGoals.slice(0, 2).join('、')}等商业目标上有共同追求`;
      } else if (synergies.length > 0) {
        description = `您们的商业目标可以相互促进，形成协同效应`;
      } else {
        description = `您们的商业目标有很好的互补性，可以相互支持`;
      }
      
      reasons.push({
        type: 'BUSINESS_GOALS',
        description,
        score: goalScore
      });
    }

    // 兴趣爱好匹配
    const commonInterests = this.findCommonElements(user1.interests, user2.interests);
    if (commonInterests.length > 0) {
      reasons.push({
        type: 'EXPERIENCE', // 复用类型
        description: `您们在${commonInterests.slice(0, 3).join('、')}等方面有共同兴趣，有很好的话题基础`,
        score: Math.min(1.0, commonInterests.length * 0.3)
      });
    }

    return reasons;
  }

  /**
   * 查找共同元素
   */
  private findCommonElements(arr1: string[], arr2: string[]): string[] {
    if (!arr1?.length || !arr2?.length) return [];
    
    return arr1.filter(item1 => 
      arr2.some(item2 => 
        item1.toLowerCase().trim() === item2.toLowerCase().trim()
      )
    );
  }

  /**
   * 查找商业协同机会
   */
  private findBusinessSynergies(goals1: string[], goals2: string[]): string[] {
    const synergies: string[] = [];
    
    // 找到相似或互补的商业目标
    const similarGoals = this.findSimilarGoals(goals1.map(g => g.toLowerCase()), goals2.map(g => g.toLowerCase()));
    const complementaryGoals = this.findComplementaryGoals(goals1.map(g => g.toLowerCase()), goals2.map(g => g.toLowerCase()));
    
    synergies.push(...similarGoals);
    synergies.push(...complementaryGoals);
    
    return [...new Set(synergies)];
  }

  /**
   * 根据匹配分数确定推荐强度
   */
  private getRecommendationStrength(score: number): RecommendationStrength {
    if (score >= 0.8) return 'HIGH';
    if (score >= 0.6) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * 应用过滤器
   */
  private applyFilters(
    results: MatchResult[], 
    filterOptions: FilterOptions,
    userPreferences?: MatchingPreferences | null
  ): MatchResult[] {
    let filtered = results;

    // 最低分数过滤
    if (filterOptions.minScore !== undefined) {
      filtered = filtered.filter(result => result.match_score >= filterOptions.minScore!);
    }

    // 偏好匹配过滤
    if (filterOptions.preferenceMatchOnly && userPreferences) {
      filtered = filtered.filter(result => 
        result.partial_match?.matchPercentage && result.partial_match.matchPercentage > 0
      );
    }

    // TODO: 实现其他过滤器（已连接用户、在线状态等）
    // 这些需要额外的数据源支持

    return filtered;
  }

  /**
   * 应用排序策略
   */
  private applySortStrategy(
    results: MatchResult[], 
    strategy: SortStrategy,
    userPreferences?: MatchingPreferences | null
  ): MatchResult[] {
    const sorted = [...results];

    switch (strategy) {
      case 'SCORE_DESC':
        // 纯分数降序
        return sorted.sort((a, b) => b.match_score - a.match_score);

      case 'PREFERENCE_FIRST':
        // 偏好匹配优先，然后按分数
        return sorted.sort((a, b) => {
          const aPreferenceScore = a.partial_match?.matchPercentage || 0;
          const bPreferenceScore = b.partial_match?.matchPercentage || 0;
          
          if (aPreferenceScore !== bPreferenceScore) {
            return bPreferenceScore - aPreferenceScore;
          }
          return b.match_score - a.match_score;
        });

      case 'DIVERSITY':
        // 多样性优先排序
        return this.sortByDiversity(sorted);

      case 'BALANCED':
      default:
        // 平衡排序：综合考虑分数、偏好和多样性
        return this.balancedSort(sorted, userPreferences);
    }
  }

  /**
   * 多样性排序
   */
  private sortByDiversity(results: MatchResult[]): MatchResult[] {
    const sorted: MatchResult[] = [];
    const remaining = [...results];
    
    // 按分数分组
    remaining.sort((a, b) => b.match_score - a.match_score);

    while (remaining.length > 0) {
      // 选择下一个最佳的多样性候选
      const nextCandidate = this.selectNextDiverseCandidate(sorted, remaining);
      sorted.push(nextCandidate);
      remaining.splice(remaining.indexOf(nextCandidate), 1);
    }

    return sorted;
  }

  /**
   * 选择下一个多样性候选
   */
  private selectNextDiverseCandidate(
    selected: MatchResult[], 
    candidates: MatchResult[]
  ): MatchResult {
    if (selected.length === 0) {
      return candidates[0]; // 第一个选择最高分
    }

    let bestCandidate = candidates[0];
    let bestDiversityScore = 0;

    for (const candidate of candidates) {
      const diversityScore = this.calculateDiversityScore(candidate, selected);
      const combinedScore = candidate.match_score * 0.7 + diversityScore * 0.3;
      
      if (combinedScore > bestDiversityScore) {
        bestDiversityScore = combinedScore;
        bestCandidate = candidate;
      }
    }

    return bestCandidate;
  }

  /**
   * 计算多样性分数
   */
  private calculateDiversityScore(candidate: MatchResult, selected: MatchResult[]): number {
    const candidateUser = candidate.target_user;
    let diversityScore = 100; // 起始分数

    for (const selectedResult of selected) {
      const selectedUser = selectedResult.target_user;
      
      // 行业多样性
      if (candidateUser.industry === selectedUser.industry) {
        diversityScore -= 15;
      }
      
      // 职位多样性
      if (candidateUser.position === selectedUser.position) {
        diversityScore -= 10;
      }
      
      // 公司多样性
      if (candidateUser.company === selectedUser.company) {
        diversityScore -= 20;
      }
    }

    return Math.max(0, diversityScore);
  }

  /**
   * 平衡排序
   */
  private balancedSort(
    results: MatchResult[],
    userPreferences?: MatchingPreferences | null
  ): MatchResult[] {
    return results.sort((a, b) => {
      // 综合分数 = 匹配分数 * 0.6 + 偏好匹配 * 0.3 + 推荐强度 * 0.1
      const aPreferenceScore = a.partial_match?.matchPercentage || 50;
      const bPreferenceScore = b.partial_match?.matchPercentage || 50;
      
      const aStrengthScore = this.getStrengthScore(a.recommendation_strength);
      const bStrengthScore = this.getStrengthScore(b.recommendation_strength);
      
      const aCombinedScore = a.match_score * 0.6 + aPreferenceScore * 0.3 + aStrengthScore * 0.1;
      const bCombinedScore = b.match_score * 0.6 + bPreferenceScore * 0.3 + bStrengthScore * 0.1;
      
      return bCombinedScore - aCombinedScore;
    });
  }

  /**
   * 获取推荐强度数值
   */
  private getStrengthScore(strength: RecommendationStrength): number {
    switch (strength) {
      case 'HIGH': return 100;
      case 'MEDIUM': return 60;
      case 'LOW': return 30;
      default: return 30;
    }
  }

  /**
   * 确保多样性
   */
  private ensureDiversity(results: MatchResult[], diversityFactor: number): MatchResult[] {
    const diversified: MatchResult[] = [];
    const remaining = [...results];
    
    while (remaining.length > 0 && diversified.length < results.length) {
      const candidate = remaining.shift()!;
      
      // 检查是否与已选择的结果足够多样化
      const isDiverse = this.isDiverseEnough(candidate, diversified, diversityFactor);
      
      if (isDiverse || diversified.length === 0) {
        diversified.push(candidate);
      } else {
        // 将候选放到后面重新考虑
        remaining.push(candidate);
      }
      
      // 防止无限循环
      if (remaining.length > 0 && remaining[0] === candidate) {
        diversified.push(remaining.shift()!);
      }
    }

    return diversified;
  }

  /**
   * 检查是否足够多样化
   */
  private isDiverseEnough(
    candidate: MatchResult, 
    selected: MatchResult[], 
    diversityThreshold: number
  ): boolean {
    if (selected.length === 0) return true;

    const candidateUser = candidate.target_user;
    let similarityCount = 0;

    for (const selectedResult of selected) {
      const selectedUser = selectedResult.target_user;
      
      if (candidateUser.industry === selectedUser.industry) similarityCount++;
      if (candidateUser.position === selectedUser.position) similarityCount++;
      if (candidateUser.company === selectedUser.company) similarityCount++;
    }

    const similarityRatio = similarityCount / (selected.length * 3); // 3个比较维度
    return similarityRatio <= (1 - diversityThreshold);
  }

  /**
   * 计算部分匹配信息
   */
  private calculatePartialMatch(
    targetUser: UserProfile, 
    preferences: MatchingPreferences
  ): PartialMatch {
    const matchedCriteria: string[] = [];
    const missedCriteria: string[] = [];
    let totalCriteria = 0;

    // 检查职位偏好
    if (preferences.target_positions.length > 0) {
      totalCriteria++;
      const positionMatch = preferences.target_positions.some(pos => 
        targetUser.position?.toLowerCase().includes(pos.toLowerCase())
      );
      if (positionMatch) {
        matchedCriteria.push('目标职位');
      } else {
        missedCriteria.push('目标职位');
      }
    }

    // 检查行业偏好
    if (preferences.target_industries.length > 0) {
      totalCriteria++;
      const industryMatch = preferences.target_industries.some(ind => 
        targetUser.industry?.toLowerCase().includes(ind.toLowerCase())
      );
      if (industryMatch) {
        matchedCriteria.push('目标行业');
      } else {
        missedCriteria.push('目标行业');
      }
    }

    // 检查商业目标偏好
    if (preferences.business_goal_alignment.length > 0) {
      totalCriteria++;
      const goalMatch = preferences.business_goal_alignment.some(goal =>
        targetUser.business_goals.some(userGoal => 
          userGoal.toLowerCase().includes(goal.toLowerCase())
        )
      );
      if (goalMatch) {
        matchedCriteria.push('商业目标');
      } else {
        missedCriteria.push('商业目标');
      }
    }

    // 检查公司规模偏好（简化实现）
    if (preferences.company_size_preference.length > 0) {
      totalCriteria++;
      // 这里需要更复杂的公司规模判断逻辑
      // 暂时假设50%概率匹配
      if (Math.random() > 0.5) {
        matchedCriteria.push('公司规模');
      } else {
        missedCriteria.push('公司规模');
      }
    }

    // 检查经验水平偏好（基于职位推断）
    if (preferences.experience_level_preference.length > 0) {
      totalCriteria++;
      const userLevel = this.inferExperienceLevel(targetUser.position);
      const levelMatch = preferences.experience_level_preference.includes(userLevel);
      if (levelMatch) {
        matchedCriteria.push('经验水平');
      } else {
        missedCriteria.push('经验水平');
      }
    }

    const matchPercentage = totalCriteria > 0 ? 
      Math.round((matchedCriteria.length / totalCriteria) * 100) : 100;

    let explanation = '';
    if (matchPercentage === 100) {
      explanation = '完全符合您的偏好设置';
    } else if (matchPercentage >= 80) {
      explanation = `高度符合您的偏好（${matchedCriteria.join('、')}）`;
    } else if (matchPercentage >= 50) {
      explanation = `部分符合您的偏好（${matchedCriteria.join('、')}），但在${missedCriteria.join('、')}方面不匹配`;
    } else if (matchPercentage > 0) {
      explanation = `仅在${matchedCriteria.join('、')}方面符合您的偏好`;
    } else {
      explanation = '不符合您设定的偏好条件，但基于其他因素推荐';
    }

    return {
      matchedCriteria,
      missedCriteria,
      matchPercentage,
      explanation
    };
  }

  /**
   * 根据职位推断经验水平
   */
  private inferExperienceLevel(position?: string): ExperienceLevel {
    if (!position) return 'JUNIOR';
    
    const pos = position.toLowerCase();
    if (pos.includes('ceo') || pos.includes('创始人') || pos.includes('董事') || pos.includes('总裁')) {
      return 'EXECUTIVE';
    }
    if (pos.includes('总监') || pos.includes('vp') || pos.includes('副总裁') || pos.includes('资深') || pos.includes('高级')) {
      return 'SENIOR';
    }
    if (pos.includes('经理') || pos.includes('主管') || pos.includes('负责人')) {
      return 'MID';
    }
    return 'JUNIOR';
  }

  /**
   * 增强的用户偏好匹配功能
   */
  async getPreferenceBasedRecommendations(
    userId: string, 
    eventId: string, 
    strictMode: boolean = false
  ): Promise<{
    perfect: MatchResult[];      // 完美匹配
    partial: MatchResult[];      // 部分匹配
    alternative: MatchResult[];  // 替代推荐
  }> {
    const allMatches = await this.generateMatches(userId, eventId, {
      limit: 50,
      sortStrategy: 'PREFERENCE_FIRST',
      includePartialMatches: true
    });

    const perfect: MatchResult[] = [];
    const partial: MatchResult[] = [];
    const alternative: MatchResult[] = [];

    for (const match of allMatches) {
      const matchPercentage = match.partial_match?.matchPercentage || 0;
      
      if (matchPercentage >= 90) {
        perfect.push(match);
      } else if (matchPercentage >= 50) {
        partial.push(match);
      } else {
        alternative.push(match);
      }
    }

    // 如果严格模式，只返回高匹配度的结果
    if (strictMode) {
      return {
        perfect: perfect.slice(0, 10),
        partial: partial.slice(0, 5),
        alternative: []
      };
    }

    return {
      perfect: perfect.slice(0, 5),
      partial: partial.slice(0, 8),
      alternative: alternative.slice(0, 7)
    };
  }

  /**
   * 保存匹配结果到历史记录
   */
  private async saveMatchToHistory(userId: string, eventId: string, matchResult: MatchResult): Promise<void> {
    try {
      // 检查是否已存在相同的匹配记录
      const existingMatch = await this.matchingRepository.getMatchBetweenUsers(
        userId, 
        matchResult.target_user.id, 
        eventId
      );

      if (!existingMatch) {
        // 创建新的匹配记录
        await this.matchingRepository.saveMatch({
          event_id: eventId,
          user_id: userId,
          target_user_id: matchResult.target_user.id,
          match_score: matchResult.match_score / 100, // 转换回0-1范围
          match_reasons: matchResult.match_reasons.map(r => r.description), // 只存储描述字符串
          common_interests: matchResult.common_interests,
          business_synergies: matchResult.business_synergies,
          recommendation_strength: matchResult.recommendation_strength
        });
      } else if (Math.abs(existingMatch.match_score - matchResult.match_score / 100) > 0.05) {
        // 如果分数差异超过5%，更新匹配记录
        await this.matchingRepository.updateMatchScore(existingMatch.id, matchResult.match_score / 100);
      }
    } catch (error) {
      console.error('Error saving match to history:', error);
      // 不抛出错误，避免影响主要功能
    }
  }

  /**
   * 获取用户的匹配历史记录
   */
  async getMatchHistory(
    userId: string, 
    eventId?: string, 
    options: {
      limit?: number;
      minScore?: number;
      strengthFilter?: RecommendationStrength[];
      includePastMatches?: boolean;
    } = {}
  ): Promise<{
    matches: MatchResult[];
    statistics: {
      totalMatches: number;
      averageScore: number;
      highQualityMatches: number;
      topRecommendationStrength: RecommendationStrength;
    };
  }> {
    const { limit = 50, minScore = 0, strengthFilter, includePastMatches = true } = options;

    try {
      let historicalMatches: Match[];

      if (eventId) {
        // 获取特定会议的匹配历史
        historicalMatches = await this.matchingRepository.getUserMatches(userId, eventId);
      } else {
        // 获取所有匹配历史（需要实现）
        historicalMatches = await this.getAllUserMatches(userId);
      }

      // 应用过滤器
      let filteredMatches = historicalMatches.filter(match => {
        const scoreFilter = match.match_score >= minScore / 100;
        const strengthFilterMatch = !strengthFilter || strengthFilter.includes(match.recommendation_strength);
        return scoreFilter && strengthFilterMatch;
      });

      // 限制结果数量
      filteredMatches = filteredMatches.slice(0, limit);

      // 转换为MatchResult格式
      const matchResults: MatchResult[] = [];
      for (const match of filteredMatches) {
        const targetUser = await this.userService.getProfile(match.target_user_id);
        if (targetUser) {
          // 重新生成匹配原因，因为历史记录中只存储了描述
          const currentUser = await this.userService.getProfile(userId);
          const freshMatchReasons = currentUser ? 
            this.generateMatchReasons(currentUser, targetUser) : 
            [];

          matchResults.push({
            target_user: targetUser,
            match_score: Math.round(match.match_score * 100),
            match_reasons: freshMatchReasons,
            common_interests: Array.isArray(match.common_interests) ? 
              match.common_interests : 
              JSON.parse(match.common_interests as string || '[]'),
            business_synergies: Array.isArray(match.business_synergies) ? 
              match.business_synergies : 
              JSON.parse(match.business_synergies as string || '[]'),
            recommendation_strength: match.recommendation_strength
          });
        }
      }

      // 计算统计信息
      const statistics = {
        totalMatches: historicalMatches.length,
        averageScore: historicalMatches.length > 0 ? 
          Math.round(historicalMatches.reduce((sum, m) => sum + m.match_score, 0) / historicalMatches.length * 100) : 0,
        highQualityMatches: historicalMatches.filter(m => m.recommendation_strength === 'HIGH').length,
        topRecommendationStrength: this.getTopRecommendationStrength(historicalMatches)
      };

      return { matches: matchResults, statistics };
    } catch (error) {
      console.error('Error getting match history:', error);
      throw new Error('Failed to retrieve match history');
    }
  }

  /**
   * 获取用户所有会议的匹配历史
   */
  private async getAllUserMatches(userId: string): Promise<Match[]> {
    try {
      const sql = `
        SELECT * FROM matches 
        WHERE user_id = ?
        ORDER BY created_at DESC
      `;
      return await this.matchingRepository.query<Match>(sql, [userId]);
    } catch (error) {
      console.error('Error getting all user matches:', error);
      throw error;
    }
  }

  /**
   * 获取主要推荐强度
   */
  private getTopRecommendationStrength(matches: Match[]): RecommendationStrength {
    if (matches.length === 0) return 'LOW';

    const strengthCounts = matches.reduce((acc, match) => {
      acc[match.recommendation_strength] = (acc[match.recommendation_strength] || 0) + 1;
      return acc;
    }, {} as Record<RecommendationStrength, number>);

    return Object.entries(strengthCounts)
      .sort(([,a], [,b]) => b - a)[0][0] as RecommendationStrength;
  }

  /**
   * 确保用户有冷启动档案，如果没有则创建
   */
  private async ensureColdStartProfile(userId: string): Promise<void> {
    try {
      const existingProfile = await this.feedbackRepository.getUserColdStartProfile(userId);
      if (!existingProfile) {
        // 创建默认的冷启动档案
        const userProfile = await this.userService.getProfile(userId);
        if (userProfile) {
          const coldStartProfile = {
            user_id: userId,
            initial_preferences: undefined,
            industry_similarity_score: 0.0,
            position_similarity_score: 0.0,
            profile_completeness: this.calculateBasicProfileCompleteness(userProfile),
            behavior_activity_score: 0.0,
            recommendation_diversity_factor: 0.8, // 新用户需要更多样化的推荐
            cold_start_phase: 'INITIAL' as const
          };
          
          await this.feedbackRepository.upsertUserColdStartProfile(coldStartProfile);
        }
      }
    } catch (error) {
      console.error('Error ensuring cold start profile:', error);
      // 不抛出错误，避免影响主要匹配功能
    }
  }

  /**
   * 计算基本档案完整度
   */
  private calculateBasicProfileCompleteness(user: UserProfile): number {
    const fields = ['name', 'company', 'position', 'industry', 'bio'];
    let completedFields = 0;
    
    for (const field of fields) {
      const value = (user as any)[field];
      if (value && typeof value === 'string' && value.trim()) {
        completedFields++;
      }
    }
    
    // 考虑技能、兴趣和商业目标
    if (user.skills && user.skills.length > 0) completedFields += 0.5;
    if (user.interests && user.interests.length > 0) completedFields += 0.5;
    if (user.business_goals && user.business_goals.length > 0) completedFields += 0.5;
    
    return Math.min(1.0, completedFields / (fields.length + 1.5));
  }

  /**
   * 应用个性化优化
   */
  private async applyPersonalizationOptimization(
    userId: string, 
    matchResults: MatchResult[]
  ): Promise<MatchResult[]> {
    try {
      const coldStartProfile = await this.feedbackRepository.getUserColdStartProfile(userId);
      
      if (!coldStartProfile) {
        return matchResults; // 没有档案，返回原结果
      }

      // 根据冷启动阶段调整推荐策略
      switch (coldStartProfile.cold_start_phase) {
        case 'INITIAL':
          return this.optimizeForColdStart(matchResults, coldStartProfile);
        
        case 'LEARNING':
          return await this.optimizeForLearningPhase(userId, matchResults, coldStartProfile);
        
        case 'ADAPTING':
          return await this.optimizeForAdaptingPhase(userId, matchResults, coldStartProfile);
        
        case 'ESTABLISHED':
          return await this.optimizeForEstablishedUser(userId, matchResults, coldStartProfile);
        
        default:
          return matchResults;
      }
    } catch (error) {
      console.error('Error applying personalization optimization:', error);
      return matchResults; // 发生错误时返回原结果
    }
  }

  /**
   * 为冷启动用户优化推荐
   */
  private optimizeForColdStart(
    matchResults: MatchResult[], 
    profile: any
  ): MatchResult[] {
    // 冷启动用户：增加多样性，降低门槛
    const diversityFactor = profile.recommendation_diversity_factor || 0.8;
    
    // 按行业和职位进行多样化排序
    const diversified = this.ensureDiversity(matchResults, diversityFactor);
    
    // 适当降低匹配分数要求，给更多用户机会
    return diversified.map(result => ({
      ...result,
      match_score: Math.min(100, result.match_score * 1.1) // 轻微提升分数
    }));
  }

  /**
   * 为学习阶段用户优化推荐
   */
  private async optimizeForLearningPhase(
    userId: string,
    matchResults: MatchResult[], 
    profile: any
  ): Promise<MatchResult[]> {
    // 学习阶段：结合反馈历史进行优化
    const recentFeedback = await this.feedbackRepository.getUserFeedbackHistory(userId, {
      limit: 10
    });

    if (recentFeedback.length === 0) {
      return matchResults;
    }

    // 分析用户偏好模式
    const preferredIndustries = new Set<string>();
    const preferredPositions = new Set<string>();
    
    for (const feedback of recentFeedback) {
      if (feedback.rating && feedback.rating >= 4) {
        // 从反馈中推断偏好（需要获取目标用户信息）
        // 这里简化处理
        preferredIndustries.add('positive_industry'); // 占位符
        preferredPositions.add('positive_position'); // 占位符
      }
    }

    // 基于学到的偏好调整推荐排序
    return matchResults.sort((a, b) => {
      const aIndustryBonus = preferredIndustries.has(a.target_user.industry || '') ? 10 : 0;
      const bIndustryBonus = preferredIndustries.has(b.target_user.industry || '') ? 10 : 0;
      
      return (b.match_score + bIndustryBonus) - (a.match_score + aIndustryBonus);
    });
  }

  /**
   * 为适应阶段用户优化推荐
   */
  private async optimizeForAdaptingPhase(
    userId: string,
    matchResults: MatchResult[], 
    profile: any
  ): Promise<MatchResult[]> {
    // 适应阶段：结合算法洞察进行精准优化
    const insights = await this.feedbackRepository.getUserAlgorithmInsights(userId);
    
    let optimizedResults = [...matchResults];

    for (const insight of insights) {
      if (insight.insight_type === 'DIMENSION_PREFERENCE' && insight.confidence_level > 0.6) {
        // 基于维度偏好调整分数
        optimizedResults = this.adjustScoresByDimensionPreference(optimizedResults, insight);
      } else if (insight.insight_type === 'REJECTION_PATTERN' && insight.confidence_level > 0.7) {
        // 基于拒绝模式过滤结果
        optimizedResults = this.filterByRejectionPattern(optimizedResults, insight);
      }
    }

    return optimizedResults;
  }

  /**
   * 为成熟用户优化推荐
   */
  private async optimizeForEstablishedUser(
    userId: string,
    matchResults: MatchResult[], 
    profile: any
  ): Promise<MatchResult[]> {
    // 成熟用户：高度个性化，精准推荐
    const [insights, recentStats] = await Promise.all([
      this.feedbackRepository.getUserAlgorithmInsights(userId),
      this.feedbackRepository.getFeedbackLearningStats(userId)
    ]);

    let optimizedResults = [...matchResults];

    // 应用所有可用的洞察
    for (const insight of insights) {
      if (insight.confidence_level > 0.5) {
        switch (insight.insight_type) {
          case 'DIMENSION_PREFERENCE':
            optimizedResults = this.adjustScoresByDimensionPreference(optimizedResults, insight);
            break;
          case 'CONNECTION_SUCCESS_PATTERN':
            optimizedResults = this.boostBySuccessPattern(optimizedResults, insight);
            break;
          case 'REJECTION_PATTERN':
            optimizedResults = this.filterByRejectionPattern(optimizedResults, insight);
            break;
        }
      }
    }

    // 基于历史成功率进一步优化
    if (recentStats && recentStats.connection_success_rate > 0.7) {
      // 高成功率用户，可以提供更具挑战性的推荐
      optimizedResults = optimizedResults.filter(result => result.match_score >= 70);
    }

    return optimizedResults;
  }

  /**
   * 基于维度偏好调整分数
   */
  private adjustScoresByDimensionPreference(
    results: MatchResult[], 
    insight: any
  ): MatchResult[] {
    const preferenceData = insight.insight_data.dimension_preferences;
    if (!preferenceData) return results;

    return results.map(result => {
      let scoreAdjustment = 0;
      
      // 基于偏好调整分数（简化实现）
      if (preferenceData.preferred_dimensions.includes('industry_relevance')) {
        scoreAdjustment += 5;
      }
      if (preferenceData.preferred_dimensions.includes('position_compatibility')) {
        scoreAdjustment += 5;
      }
      if (preferenceData.preferred_dimensions.includes('business_goal_synergy')) {
        scoreAdjustment += 8;
      }
      if (preferenceData.preferred_dimensions.includes('skills_relevance')) {
        scoreAdjustment += 3;
      }

      return {
        ...result,
        match_score: Math.min(100, result.match_score + scoreAdjustment)
      };
    });
  }

  /**
   * 基于拒绝模式过滤结果
   */
  private filterByRejectionPattern(
    results: MatchResult[], 
    insight: any
  ): MatchResult[] {
    const rejectionData = insight.insight_data.rejection_patterns;
    if (!rejectionData) return results;

    // 过滤掉容易被拒绝的类型（简化实现）
    return results.filter(result => {
      // 这里应该基于具体的拒绝原因进行过滤
      // 简化实现：降低低分推荐的权重
      return result.match_score >= 60;
    });
  }

  /**
   * 基于成功模式提升推荐
   */
  private boostBySuccessPattern(
    results: MatchResult[], 
    insight: any
  ): MatchResult[] {
    const successData = insight.insight_data.connection_success_patterns;
    if (!successData) return results;

    return results.map(result => {
      let scoreBoost = 0;
      
      // 基于成功因子提升分数（简化实现）
      for (const [factor, weight] of Object.entries(successData.success_factors || {})) {
        if (typeof weight === 'number' && weight > 0.7) {
          scoreBoost += 8;
        }
      }

      return {
        ...result,
        match_score: Math.min(100, result.match_score + scoreBoost)
      };
    });
  }

  /**
   * 获取会议匹配统计信息
   */
  async getEventMatchingStats(eventId: string): Promise<{
    totalMatches: number;
    averageScore: number;
    highQualityMatches: number;
    participantStats: {
      totalParticipants: number;
      activeMatchers: number;
      averageMatchesPerUser: number;
    };
    scoreDistribution: {
      high: number;    // 80-100分
      medium: number;  // 60-79分
      low: number;     // 0-59分
    };
  }> {
    try {
      const basicStats = await this.matchingRepository.getEventMatchStats(eventId);
      
      // 获取参与者统计
      const participants = await this.eventService.getEventParticipants(eventId, 'system'); // 使用系统身份
      const participantStats = {
        totalParticipants: participants.length,
        activeMatchers: 0, // 需要查询有匹配记录的用户数
        averageMatchesPerUser: participants.length > 0 ? basicStats.totalMatches / participants.length : 0
      };

      // 获取分数分布
      const scoreDistribution = await this.getScoreDistribution(eventId);

      return {
        ...basicStats,
        participantStats,
        scoreDistribution
      };
    } catch (error) {
      console.error('Error getting event matching stats:', error);
      throw new Error('Failed to get event matching statistics');
    }
  }

  /**
   * 获取分数分布
   */
  private async getScoreDistribution(eventId: string): Promise<{
    high: number;
    medium: number;
    low: number;
  }> {
    try {
      const result = await this.matchingRepository.queryOne<{
        high_count: number;
        medium_count: number;
        low_count: number;
      }>(`
        SELECT 
          COUNT(CASE WHEN match_score >= 0.8 THEN 1 END) as high_count,
          COUNT(CASE WHEN match_score >= 0.6 AND match_score < 0.8 THEN 1 END) as medium_count,
          COUNT(CASE WHEN match_score < 0.6 THEN 1 END) as low_count
        FROM matches 
        WHERE event_id = ?
      `, [eventId]);

      return {
        high: result?.high_count || 0,
        medium: result?.medium_count || 0,
        low: result?.low_count || 0
      };
    } catch (error) {
      console.error('Error getting score distribution:', error);
      return { high: 0, medium: 0, low: 0 };
    }
  }
}
