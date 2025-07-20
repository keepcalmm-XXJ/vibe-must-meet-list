const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/v1';

// Test data
const testUser = {
  email: 'eventtest@example.com',
  password: 'Password123',
  name: 'Event Test User',
  company: 'Test Company',
  position: 'Test Position',
  industry: 'Technology'
};

const testEvent = {
  name: 'Test Conference 2024',
  description: 'A test conference for networking',
  start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
  end_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Day after tomorrow
  location: 'Test Convention Center',
  max_participants: 100
};

let authToken = '';
let eventId = '';
let eventCode = '';

async function testEventAPI() {
  try {
    console.log('🚀 Starting Event API Tests...\n');

    // 1. Register a test user
    console.log('1. Registering test user...');
    try {
      await axios.post(`${BASE_URL}/auth/register`, testUser);
      console.log('✅ User registered successfully');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('ℹ️  User already exists, continuing...');
      } else {
        throw error;
      }
    }

    // 2. Login to get auth token
    console.log('2. Logging in...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    authToken = loginResponse.data.data.token;
    console.log('✅ Login successful');

    const headers = { Authorization: `Bearer ${authToken}` };

    // 3. Create an event
    console.log('3. Creating event...');
    const createEventResponse = await axios.post(`${BASE_URL}/events`, testEvent, { headers });
    const createdEvent = createEventResponse.data.data;
    eventId = createdEvent.id;
    eventCode = createdEvent.event_code;
    console.log(`✅ Event created successfully with ID: ${eventId} and code: ${eventCode}`);

    // 4. Get event details
    console.log('4. Getting event details...');
    const getEventResponse = await axios.get(`${BASE_URL}/events/${eventId}`, { headers });
    const eventDetails = getEventResponse.data.data;
    console.log(`✅ Event details retrieved: ${eventDetails.name}`);

    // 5. Update event
    console.log('5. Updating event...');
    const updateData = { description: 'Updated description for the test conference' };
    const updateEventResponse = await axios.put(`${BASE_URL}/events/${eventId}`, updateData, { headers });
    console.log('✅ Event updated successfully');

    // 6. Update event status
    console.log('6. Updating event status...');
    await axios.patch(`${BASE_URL}/events/${eventId}/status`, { status: 'ACTIVE' }, { headers });
    console.log('✅ Event status updated successfully');

    // 7. Join event by code (should fail since user is organizer)
    console.log('7. Attempting to join own event (should fail)...');
    try {
      await axios.post(`${BASE_URL}/events/join`, { eventCode }, { headers });
      console.log('❌ Should not be able to join own event');
    } catch (error) {
      if (error.response?.status === 409) {
        console.log('✅ Correctly prevented organizer from joining own event');
      } else {
        console.log('⚠️  Unexpected error:', error.response?.data?.error?.message);
      }
    }

    // 8. Get event participants
    console.log('8. Getting event participants...');
    const participantsResponse = await axios.get(`${BASE_URL}/events/${eventId}/participants`, { headers });
    console.log(`✅ Event participants retrieved: ${participantsResponse.data.data.length} participants`);

    // 9. Get user's events
    console.log('9. Getting user events...');
    const userEventsResponse = await axios.get(`${BASE_URL}/events/my/events`, { headers });
    const userEvents = userEventsResponse.data.data;
    console.log(`✅ User events retrieved: ${userEvents.organized.length} organized, ${userEvents.participating.length} participating`);

    // 10. Get active events
    console.log('10. Getting active events...');
    const activeEventsResponse = await axios.get(`${BASE_URL}/events/active`, { headers });
    console.log(`✅ Active events retrieved: ${activeEventsResponse.data.data.length} events`);

    // 11. Delete event
    console.log('11. Deleting event...');
    await axios.delete(`${BASE_URL}/events/${eventId}`, { headers });
    console.log('✅ Event deleted successfully');

    console.log('\n🎉 All Event API tests completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run tests
testEventAPI();