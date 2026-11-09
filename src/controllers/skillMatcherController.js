const DATA = require('../models/skillData');
const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';
const AI_SERVICE_TIMEOUT = 1500; // Fast 1.5s timeout for AI microservice
const ENABLE_AI_SERVICE = process.env.ENABLE_AI_SERVICE === 'true';

// ============================================================================
// SKILL MATCHING ENGINE (Smart built-in matcher + optional AI microservice)
// ============================================================================

/**
 * Match user skills to available jobs
 */
exports.matchSkillsToJobs = async (req, res) => {
    try {
        const { skills, department = 'all' } = req.body;
        
        if (!skills || skills.trim().length === 0) {
            return res.status(400).json({ 
                error: 'Please provide at least one skill' 
            });
        }
        
        // If AI microservice is explicitly enabled in environment, attempt it first
        if (ENABLE_AI_SERVICE) {
            try {
                const aiResponse = await axios.post(
                    `${AI_SERVICE_URL}/api/ai-match`,
                    { skills, department },
                    { timeout: AI_SERVICE_TIMEOUT }
                );
                
                return res.status(200).json({
                    success: true,
                    method: 'ai-semantic',
                    ...aiResponse.data
                });
            } catch (aiError) {
                console.warn('AI microservice unavailable, using built-in matcher:', aiError.message);
            }
        }
        
        // Use built-in smart matching engine
        return matchSkillsToJobsBasic(req, res);
        
    } catch (error) {
        console.error('Skill matching error:', error);
        res.status(500).json({ 
            error: 'Error matching skills to jobs',
            details: error.message 
        });
    }
};

// ============================================================================
// SKILL EXTRACTION (from free-text description)
// ============================================================================

/**
 * Extract skills from free-text user input
 */
exports.extractSkillsFromText = async (req, res) => {
    try {
        const { text, threshold = 0.65 } = req.body;
        
        if (!text || text.trim().length === 0) {
            return res.status(400).json({ 
                error: 'Please provide text to analyze' 
            });
        }
        
        // If AI microservice is explicitly enabled, attempt it first
        if (ENABLE_AI_SERVICE) {
            try {
                const aiResponse = await axios.post(
                    `${AI_SERVICE_URL}/api/extract-skills`,
                    { text, threshold },
                    { timeout: AI_SERVICE_TIMEOUT }
                );
                
                return res.status(200).json({
                    success: true,
                    method: 'ai-extraction',
                    ...aiResponse.data
                });
            } catch (aiError) {
                console.warn('AI microservice unavailable for extraction, using built-in parsing:', aiError.message);
            }
        }

        // Built-in smart text parsing and skill identification
        const textLower = text.toLowerCase();
        const allSkills = new Set();
        ['chem-eng', 'biotech', 'bioinfo', 'bioeng-nano', 'chem'].forEach(dept => {
            if (DATA[dept]) {
                DATA[dept].forEach(job => {
                    if (job.requiredSkills && Array.isArray(job.requiredSkills)) {
                        job.requiredSkills.forEach(skill => allSkills.add(skill));
                    }
                });
            }
        });
        
        // Extract skills: check if skill name (or significant substring) appears in text
        const extractedSkills = Array.from(allSkills)
            .filter(skill => {
                const skillLower = skill.toLowerCase();
                if (textLower.includes(skillLower)) return true;
                const skillParts = skillLower.split(/[\s\-\/\+]/);
                return skillParts.some(part => part.length > 2 && textLower.includes(part));
            })
            .map(skill => {
                const skillLower = skill.toLowerCase();
                const exact = textLower.includes(skillLower);
                return { skill, confidence: exact ? 95 : 75 };
            })
            .sort((a, b) => b.confidence - a.confidence);
        
        return res.status(200).json({
            success: true,
            method: 'smart-extraction',
            originalText: text,
            extractedSkills: extractedSkills,
            skillCount: extractedSkills.length,
            skillsList: extractedSkills.map(s => s.skill),
            topSkills: extractedSkills.slice(0, 10)
        });

    } catch (error) {
        console.error('Skill extraction error:', error);
        res.status(500).json({ 
            error: 'Error extracting skills',
            details: error.message 
        });
    }
};

// ============================================================================
// BUILT-IN SMART MATCHING ENGINE (string, synonym, category, and fuzzy distance)
// ============================================================================

// Skill similarity scoring (0-1)
const calculateSkillSimilarity = (userSkill, requiredSkill) => {
    const user = userSkill.toLowerCase().trim();
    const required = requiredSkill.toLowerCase().trim();
    
    // Exact match
    if (user === required) return 1.0;
    
    // Substring match
    if (user.includes(required) || required.includes(user)) return 0.85;
    
    // Category match
    const categories = {
        'programming': ['python', 'java', 'c++', 'javascript', 'coding', 'algorithm', 'r programming'],
        'data': ['data', 'analytics', 'analysis', 'statistics', 'ml', 'ai', 'machine learning', 'sql'],
        'biology': ['genetics', 'molecular', 'cellular', 'immunology', 'biochemistry', 'dna sequencing', 'protein analysis'],
        'lab': ['hplc', 'pcr', 'elisa', 'microscope', 'spectroscopy', 'chromatography', 'nmr', 'tem', 'rt-pcr'],
        'design': ['cad', 'autocad', 'fusion', 'solidworks', 'design', 'modeling', 'prototyping'],
        'process': ['aspen', 'hysys', 'simulation', 'matlab', 'modeling', 'scale-up', 'reaction engineering'],
        'management': ['project', 'agile', 'scrum', 'leadership', 'team', 'communication', 'six sigma', 'quality control']
    };
    
    for (const [category, keywords] of Object.entries(categories)) {
        const userInCategory = keywords.some(k => user.includes(k));
        const requiredInCategory = keywords.some(k => required.includes(k));
        if (userInCategory && requiredInCategory) return 0.7;
    }
    
    // Levenshtein distance for typos
    const distance = levenshteinDistance(user, required);
    const maxLen = Math.max(user.length, required.length);
    if (distance <= 2 && maxLen > 3) return 0.75;
    
    return 0;
};

// Levenshtein distance for fuzzy typo matching
const levenshteinDistance = (str1, str2) => {
    const matrix = [];
    for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
    for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
    
    for (let i = 1; i <= str2.length; i++) {
        for (let j = 1; j <= str1.length; j++) {
            if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[str2.length][str1.length];
};

// Calculate match percentage for a job
const matchJobToSkills = (job, userSkills) => {
    if (!job.requiredSkills || job.requiredSkills.length === 0) return 0;
    
    const userSkillsArray = userSkills
        .split(',')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    
    if (userSkillsArray.length === 0) return 0;
    
    // Calculate match for each required skill
    const skillMatches = job.requiredSkills.map(requiredSkill => {
        const maxSimilarity = Math.max(
            ...userSkillsArray.map(userSkill => 
                calculateSkillSimilarity(userSkill, requiredSkill)
            )
        );
        return maxSimilarity;
    });
    
    const avgMatch = skillMatches.reduce((a, b) => a + b, 0) / skillMatches.length;
    const confidence = avgMatch * 100;
    
    return {
        confidence: Math.round(confidence),
        matchedSkills: job.requiredSkills.filter((skill, idx) => skillMatches[idx] > 0),
        remainingSkills: job.requiredSkills.filter((skill, idx) => skillMatches[idx] === 0)
    };
};

/**
 * Built-in matching using fuzzy and category scoring
 */
const matchSkillsToJobsBasic = async (req, res) => {
    try {
        const { skills, department = 'all' } = req.body;
        
        let allJobs = [];
        const departments = department === 'all' 
            ? ['chem-eng', 'biotech', 'bioinfo', 'bioeng-nano', 'chem']
            : [department];
        
        departments.forEach(dept => {
            if (DATA[dept]) {
                DATA[dept].forEach(job => {
                    allJobs.push({ ...job, department: dept });
                });
            }
        });
        
        const matchedJobs = allJobs
            .map(job => {
                const match = matchJobToSkills(job, skills);
                return {
                    ...job,
                    ...match,
                    learningResources: job.learningResources || []
                };
            })
            .filter(job => job.confidence > 0)
            .sort((a, b) => b.confidence - a.confidence);
        
        res.status(200).json({
            success: true,
            method: 'smart-match',
            skillsProvided: skills.split(',').map(s => s.trim()),
            totalMatches: matchedJobs.length,
            matches: matchedJobs.slice(0, 15),
            topMatch: matchedJobs.length > 0 ? {
                ...matchedJobs[0],
                topOpportunity: true
            } : null
        });
        
    } catch (error) {
        console.error('Basic matching error:', error);
        res.status(500).json({ 
            error: 'Error matching skills to jobs',
            details: error.message 
        });
    }
};

// Get all available job skills for autocomplete
exports.getAvailableSkills = async (req, res) => {
    try {
        if (ENABLE_AI_SERVICE) {
            try {
                const aiResponse = await axios.get(
                    `${AI_SERVICE_URL}/api/available-skills`,
                    { timeout: AI_SERVICE_TIMEOUT }
                );
                
                return res.status(200).json({
                    success: true,
                    method: 'ai-semantic',
                    ...aiResponse.data
                });
            } catch (aiError) {
                console.warn('AI microservice unavailable for skills list, using local data');
            }
        }

        const allSkills = new Set();
        ['chem-eng', 'biotech', 'bioinfo', 'bioeng-nano', 'chem'].forEach(dept => {
            if (DATA[dept]) {
                DATA[dept].forEach(job => {
                    if (job.requiredSkills && Array.isArray(job.requiredSkills)) {
                        job.requiredSkills.forEach(skill => allSkills.add(skill));
                    }
                });
            }
        });
        
        res.status(200).json({
            success: true,
            method: 'local-data',
            availableSkills: Array.from(allSkills).sort(),
            count: allSkills.size
        });
    } catch (error) {
        console.error('Error fetching available skills:', error);
        res.status(500).json({ 
            error: 'Error fetching available skills',
            details: error.message
        });
    }
};

// Get learning resources for a specific skill
exports.getLearningResources = async (req, res) => {
    try {
        const { skill } = req.params;
        
        if (!DATA.learningResources || !DATA.learningResources[skill]) {
            return res.status(404).json({ 
                error: `No learning resources found for skill: ${skill}` 
            });
        }
        
        res.status(200).json({
            success: true,
            skill,
            resources: DATA.learningResources[skill]
        });
    } catch (error) {
        res.status(500).json({ 
            error: 'Error fetching learning resources' 
        });
    }
};
