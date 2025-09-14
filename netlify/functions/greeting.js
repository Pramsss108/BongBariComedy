exports.handler = async () => {
  const messages = [
    { text: '🙏 Namaskar! Ami Bong Bot, Bong Bari er official AI assistant!' },
    { text: 'চা রেডি? Adda shuru kori! 😄' },
  ];
  return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(messages[0]) };
};
