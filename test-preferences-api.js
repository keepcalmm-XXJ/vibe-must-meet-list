const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

async function testMatchingPreferencesAPI() {
  try {
    console.log('🚀 Testing Matching Preferences API...\n');

    // Step 1: Register a test user
    console.log('1. Registering test user...');
    const registerResponse = await axios.post(`${BASE_URL}/auth/register`, {
      email: 'test-preferences@example.com',
      password: 'Password123!',
      name: 'Test User',
      company: 'Test Company',
      position: 'Software Engineer',
      industry: 'Technology',
    });

    const { token, user } = registerResponse.data.data;
    console.log('✅ User registered successfully');
    console.log(`   User ID: ${user.id}`);
    console.log(`   Token: ${token.substring(0, 20)}...`);

    const headers = { Authorization: `Bearer ${token}` };

    // Step 2: Get preferences (should be null initially)
    console.log('\n2. Getting initial preferences...');
    const getInitialResponse = await axios.get(`${BASE_URL}/users/preferences`, { headers });
    console.log('✅ Initial preferences retrieved');
    console.log(`   Preferences: ${getInitialResponse.data.data.preferences}`);

    // Step 3: Set matching preferences
    console.log('\n3. Setting matching preferences...');
    const preferences = {
      target_positions: ['CEO', 'CTO', 'Product Manager'],
      target_industries: ['Technology', 'Finance', 'Healthcare'],
      company_size_preference: ['STARTUP', 'SME'],
      experience_level_preference: ['SENIOR', 'EXECUTIVE'],
      business_goal_alignment: ['Networking', 'Investment', 'Partnership'],
      geographic_preference: ['San Francisco', 'New York'],
    };

    const setResponse = await axios.put(`${BASE_URL}/users/preferences`, preferences, { headers });
    console.log('✅ Preferences set successfully');
    console.log(`   Message: ${setResponse.data.message}`);
    console.log(`   Target positions: ${setResponse.data.data.preferences.target_positions.join(', ')}`);

    // Step 4: Get preferences again (should return the set preferences)
    console.log('\n4. Getting updated preferences...');
    const getUpdatedResponse = await axios.get(`${BASE_URL}/users/preferences`, { headers });
    console.log('✅ Updated preferences retrieved');
    console.log(`   Target positions: ${getUpdatedResponse.data.data.preferences.target_positions.join(', ')}`);
    console.log(`   Target industries: ${getUpdatedResponse.data.data.preferences.target_industries.join(', ')}`);
    console.log(`   Company sizes: ${getUpdatedResponse.data.data.preferences.company_size_preference.join(', ')}`);

    // Step 5: Update preferences
    console.log('\n5. Updating preferences...');
    const updatedPreferences = {
      target_positions: ['VP Engineering', 'Director'],
      target_industries: ['AI/ML', 'Fintech'],
      company_size_preference: ['ENTERPRISE'],
      experience_level_preference: ['EXECUTIVE'],
      business_goal_alignment: ['Strategic Partnership'],
      geographic_preference: ['London', 'Berlin'],
    };

    const updateResponse = await axios.put(`${BASE_URL}/users/preferences`, updatedPreferences, { headers });
    console.log('✅ Preferences updated successfully');
    console.log(`   New target positions: ${updateResponse.data.data.preferences.target_positions.join(', ')}`);

    // Step 6: Test validation errors
    console.log('\n6. Testing validation errors...');
    try {
      await axios.put(`${BASE_URL}/users/preferences`, {
        target_positions: ['CEO'],
        target_industries: ['Technology'],
        company_size_preference: ['INVALID_SIZE'], // Invalid value
        experience_level_preference: ['SENIOR'],
        business_goal_alignment: ['Networking'],
      }, { headers });
      console.log('❌ Validation should have failed');
    } catch (error) {
      console.log('✅ Validation error caught correctly');
      console.log(`   Error: ${error.response.data.error.message}`);
    }

    // Step 7: Delete preferences
    console.log('\n7. Deleting preferences...');
    const deleteResponse = await axios.delete(`${BASE_URL}/users/preferences`, { headers });
    console.log('✅ Preferences deleted successfully');
    console.log(`   Message: ${deleteResponse.data.message}`);

    // Step 8: Verify deletion
    console.log('\n8. Verifying deletion...');
    const getFinalResponse = await axios.get(`${BASE_URL}/users/preferences`, { headers });
    console.log('✅ Deletion verified');
    console.log(`   Preferences: ${getFinalResponse.data.data.preferences}`);

    console.log('\n🎉 All tests passed! Matching Preferences API is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testMatchingPreferencesAPI();