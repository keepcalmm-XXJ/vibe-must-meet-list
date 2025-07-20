const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testUserAPI() {
  try {
    console.log('Testing User Registration and Profile Management API...\n');

    // Test 1: Register a new user
    console.log('1. Testing user registration...');
    const registerData = {
      email: 'test@example.com',
      password: 'TestPassword123',
      name: 'Test User',
      company: 'Test Company',
      position: 'Software Engineer',
      industry: 'Technology',
      bio: 'Test bio for user profile',
      linkedin_profile: 'https://linkedin.com/in/testuser'
    };

    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, registerData);
    console.log('✓ User registration successful');
    console.log('Response:', registerResponse.data);
    
    const token = registerResponse.data.data.token;
    const headers = { Authorization: `Bearer ${token}` };

    // Test 2: Get user profile
    console.log('\n2. Testing get user profile...');
    const profileResponse = await axios.get(`${BASE_URL}/users/profile`, { headers });
    console.log('✓ Get user profile successful');
    console.log('Profile:', profileResponse.data.data.profile);

    // Test 3: Update user profile
    console.log('\n3. Testing update user profile...');
    const updateData = {
      name: 'Updated Test User',
      company: 'Updated Company',
      bio: 'Updated bio with more information',
      skills: ['JavaScript', 'TypeScript', 'React', 'Node.js'],
      interests: ['AI', 'Machine Learning', 'Web Development'],
      business_goals: ['Network with industry leaders', 'Find potential partners']
    };

    const updateResponse = await axios.put(`${BASE_URL}/users/profile`, updateData, { headers });
    console.log('✓ Update user profile successful');
    console.log('Updated profile:', updateResponse.data.data.profile);

    // Test 4: Test avatar upload (create a dummy image file)
    console.log('\n4. Testing avatar upload...');
    
    // Create a simple test image file (1x1 pixel PNG)
    const testImageBuffer = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0x00,
      0xFF, 0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33,
      0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
    ]);
    
    fs.writeFileSync('test-avatar.png', testImageBuffer);
    
    const formData = new FormData();
    formData.append('avatar', fs.createReadStream('test-avatar.png'));
    
    const avatarResponse = await axios.post(`${BASE_URL}/users/avatar`, formData, {
      headers: {
        ...headers,
        ...formData.getHeaders()
      }
    });
    
    console.log('✓ Avatar upload successful');
    console.log('Avatar response:', avatarResponse.data);
    
    // Clean up test file
    fs.unlinkSync('test-avatar.png');

    console.log('\n✅ All User API tests passed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    
    // Clean up test file if it exists
    if (fs.existsSync('test-avatar.png')) {
      fs.unlinkSync('test-avatar.png');
    }
  }
}

// Run tests
testUserAPI();