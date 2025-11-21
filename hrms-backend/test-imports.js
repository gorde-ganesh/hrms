// Test script to check if controllers can be imported
import('./src/controllers/auth.controller.js')
  .then(() => {
    console.log('✅ auth.controller loaded successfully');
    return import('./src/controllers/employee.controller.js');
  })
  .then(() => {
    console.log('✅ employee.controller loaded successfully');
    return import('./src/controllers/leave.controller.js');
  })
  .then(() => {
    console.log('✅ leave.controller loaded successfully');
    return import('./src/controllers/chat.controller.js');
  })
  .then(() => {
    console.log('✅ chat.controller loaded successfully');
    console.log('\n✅ All controllers loaded successfully!');
  })
  .catch((error) => {
    console.error('❌ Error loading controllers:', error);
    process.exit(1);
  });
