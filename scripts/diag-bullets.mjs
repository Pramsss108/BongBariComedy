// Diagnostic: confirm bullet-stripping bug
const input = `Key characteristics include:\n- High efficiency in data processing\n- Ability to automate repetitive tasks\n- Continuous improvement through learning algorithms\n\nDespite these advantages, AI has limits.`;
const stripped = input.replace(/^[\-\*\u2022]\s+/gm, '');
console.log('=== ORIGINAL (what user typed) ===');
console.log(input);
console.log('\n=== WHAT SERVER RECEIVES after cleanInputText strips bullets ===');
console.log(stripped);
console.log('\nBullet lines stripped:', (input.match(/^[\-\*]\s/gm) || []).length);
