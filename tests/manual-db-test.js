const { UserRepository, EventRepository } = require('../dist/server/database/repositories');
const DatabaseManager = require('../dist/server/database/connection').default;
const DatabaseMigrator = require('../database/migrate');
const path = require('path');
const fs = require('fs');

async function runManualTest() {
  const TEST_DB_PATH = path.join(process.cwd(), 'database', 'manual-test.db');
  
  try {
    console.log('🧪 Starting manual database test...');
    
    // Clean up any existing test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
      console.log('✅ Cleaned up existing test database');
    }

    // Set test database path
    process.env.DB_PATH = TEST_DB_PATH;

    // Run migrations
    console.log('📦 Running migrations...');
    const migrator = new DatabaseMigrator();
    await migrator.runMigrations();
    console.log('✅ Migrations completed');

    // Connect to database
    console.log('🔌 Connecting to database...');
    await DatabaseManager.getInstance().connect();
    console.log('✅ Database connected');

    // Initialize repositories
    const userRepository = new UserRepository();
    const eventRepository = new EventRepository();

    // Test 1: Create a user
    console.log('\n📝 Test 1: Creating a user...');
    const userData = {
      id: 'test-user-manual',
      email: 'manual@example.com',
      password_hash: 'hashed_password',
      name: 'Manual Test User',
      company: 'Test Company',
      position: 'Developer'
    };

    const createdUser = await userRepository.create(userData);
    console.log('✅ User created:', {
      id: createdUser.id,
      email: createdUser.email,
      name: createdUser.name
    });

    // Test 2: Find user by ID
    console.log('\n🔍 Test 2: Finding user by ID...');
    const foundUser = await userRepository.findById('test-user-manual');
    console.log('✅ User found:', foundUser ? 'Yes' : 'No');
    console.log('   Email:', foundUser?.email);

    // Test 3: Find user by email
    console.log('\n📧 Test 3: Finding user by email...');
    const foundByEmail = await userRepository.findByEmail('manual@example.com');
    console.log('✅ User found by email:', foundByEmail ? 'Yes' : 'No');
    console.log('   ID:', foundByEmail?.id);

    // Test 4: Create an event
    console.log('\n🎪 Test 4: Creating an event...');
    const eventData = {
      id: 'test-event-manual',
      name: 'Manual Test Event',
      description: 'A manual test event',
      start_date: new Date('2024-12-01T09:00:00Z'),
      end_date: new Date('2024-12-01T17:00:00Z'),
      location: 'Test Location',
      organizer_id: createdUser.id,
      event_code: 'MANUAL123',
      status: 'ACTIVE'
    };

    const createdEvent = await eventRepository.create(eventData);
    console.log('✅ Event created:', {
      id: createdEvent.id,
      name: createdEvent.name,
      event_code: createdEvent.event_code
    });

    // Test 5: Find event by code
    console.log('\n🔍 Test 5: Finding event by code...');
    const foundEvent = await eventRepository.findByEventCode('MANUAL123');
    console.log('✅ Event found:', foundEvent ? 'Yes' : 'No');
    console.log('   Name:', foundEvent?.name);

    // Test 6: Add participant to event
    console.log('\n👥 Test 6: Adding participant to event...');
    const participant = await eventRepository.addParticipant(createdEvent.id, createdUser.id);
    console.log('✅ Participant added:', {
      event_id: participant.event_id,
      user_id: participant.user_id,
      status: participant.status
    });

    // Test 7: Check if user is participant
    console.log('\n✅ Test 7: Checking participant status...');
    const isParticipant = await eventRepository.isParticipant(createdEvent.id, createdUser.id);
    console.log('✅ Is participant:', isParticipant);

    // Test 8: Get participant count
    console.log('\n📊 Test 8: Getting participant count...');
    const count = await eventRepository.getParticipantCount(createdEvent.id);
    console.log('✅ Participant count:', count);

    // Test 9: Raw query test
    console.log('\n🔧 Test 9: Testing raw queries...');
    const userCount = await userRepository.query('SELECT COUNT(*) as count FROM users');
    console.log('✅ Total users in database:', userCount[0].count);

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    // Clean up
    try {
      await DatabaseManager.getInstance().close();
      console.log('✅ Database connection closed');
    } catch (e) {
      console.log('⚠️  Error closing database:', e.message);
    }
    
    // Clean up test database
    if (fs.existsSync(TEST_DB_PATH)) {
      fs.unlinkSync(TEST_DB_PATH);
      console.log('✅ Test database cleaned up');
    }
  }
}

// Run the test
runManualTest();