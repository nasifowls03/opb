(async () => {
  try {
    await import('./commands/op.js');
    console.log('import succeeded');
  } catch (e) {
    console.error('IMPORT ERROR:', e && e.message ? e.message : e);
    if (e && e.stack) console.error(e.stack);
    process.exit(1);
  }
})();
