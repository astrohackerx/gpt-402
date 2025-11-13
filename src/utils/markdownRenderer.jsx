const parseMarkdown = (text) => {
  const elements = [];
  let currentIndex = 0;
  let key = 0;

  const patterns = [
    { regex: /###\s+(.+?)(?=\n|$)/g, type: 'heading3' },
    { regex: /##\s+(.+?)(?=\n|$)/g, type: 'heading2' },
    { regex: /#\s+(.+?)(?=\n|$)/g, type: 'heading1' },
    { regex: /\*\*(.+?)\*\*/g, type: 'bold' },
    { regex: /\[(.+?)\]\((.+?)\)/g, type: 'link' },
    { regex: /`([^`]+)`/g, type: 'code' },
    { regex: /```(\w*)\n([\s\S]+?)```/g, type: 'codeblock' }
  ];

  const matches = [];
  patterns.forEach(pattern => {
    let match;
    const regex = new RegExp(pattern.regex);
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        type: pattern.type,
        start: match.index,
        end: regex.lastIndex,
        match: match
      });
    }
  });

  matches.sort((a, b) => a.start - b.start);

  const processedRanges = [];
  const validMatches = matches.filter(match => {
    const overlaps = processedRanges.some(
      range => match.start < range.end && match.end > range.start
    );
    if (!overlaps) {
      processedRanges.push({ start: match.start, end: match.end });
      return true;
    }
    return false;
  });

  validMatches.forEach(item => {
    if (item.start > currentIndex) {
      const textBefore = text.substring(currentIndex, item.start);
      elements.push(...splitByNewlines(textBefore, key));
      key += textBefore.split('\n').length;
    }

    switch (item.type) {
      case 'heading1':
        elements.push(
          <h1 key={key++} className="markdown-heading1">{item.match[1]}</h1>
        );
        break;
      case 'heading2':
        elements.push(
          <h2 key={key++} className="markdown-heading2">{item.match[1]}</h2>
        );
        break;
      case 'heading3':
        elements.push(
          <h3 key={key++} className="markdown-heading3">{item.match[1]}</h3>
        );
        break;
      case 'bold':
        elements.push(
          <strong key={key++}>{item.match[1]}</strong>
        );
        break;
      case 'link':
        elements.push(
          <a
            key={key++}
            href={item.match[2]}
            target="_blank"
            rel="noopener noreferrer"
            className="markdown-link"
          >
            {item.match[1]}
          </a>
        );
        break;
      case 'code':
        elements.push(
          <code key={key++} className="markdown-inline-code">
            {item.match[1]}
          </code>
        );
        break;
      case 'codeblock':
        const language = item.match[1] || '';
        const code = item.match[2];
        elements.push(
          <pre key={key++} className="markdown-code-block">
            {language && <div className="code-language">{language}</div>}
            <code>{code}</code>
          </pre>
        );
        break;
    }

    currentIndex = item.end;
  });

  if (currentIndex < text.length) {
    const remainingText = text.substring(currentIndex);
    elements.push(...splitByNewlines(remainingText, key));
  }

  return elements;
};

const splitByNewlines = (text, startKey) => {
  const lines = text.split('\n');
  const elements = [];

  lines.forEach((line, index) => {
    if (line.trim()) {
      elements.push(line);
    }
    if (index < lines.length - 1) {
      elements.push(<br key={`br-${startKey}-${index}`} />);
    }
  });

  return elements;
};

export const renderMarkdown = (text) => {
  if (!text) return null;
  return <div className="markdown-content">{parseMarkdown(text)}</div>;
};
