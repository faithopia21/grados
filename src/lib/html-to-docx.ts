import { 
  Document, Packer, Paragraph, 
  TextRun, HeadingLevel 
} from 'docx';

export async function htmlToDocxBlob(
  html: string
): Promise<Blob> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    html, 'text/html'
  );
  const paragraphs: Paragraph[] = [];

  function parseInlineRuns(
    node: Node
  ): TextRun[] {
    const runs: TextRun[] = [];
    
    function walk(
      n: Node, 
      bold = false, 
      italic = false, 
      underline = false
    ) {
      if (n.nodeType === Node.TEXT_NODE) {
        if (n.textContent?.trim()) {
          runs.push(new TextRun({
            text: n.textContent,
            bold,
            italics: italic,
            underline: underline 
              ? {} 
              : undefined,
          }));
        }
        return;
      }
      
      const el = n as HTMLElement;
      const tag = el.tagName?.toLowerCase();
      const nextBold = 
        bold || tag === 'strong' || 
        tag === 'b';
      const nextItalic = 
        italic || tag === 'em' || 
        tag === 'i';
      const nextUnderline = 
        underline || tag === 'u';
      
      el.childNodes.forEach(child => 
        walk(
          child, nextBold, 
          nextItalic, nextUnderline
        )
      );
    }
    
    walk(node);
    return runs;
  }

  doc.body.childNodes.forEach(node => {
    if (node.nodeType !== Node.ELEMENT_NODE) 
      return;
    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === 'h1' || tag === 'h2' || 
        tag === 'h3') {
      paragraphs.push(new Paragraph({
        heading: tag === 'h1' 
          ? HeadingLevel.HEADING_1
          : tag === 'h2'
          ? HeadingLevel.HEADING_2
          : HeadingLevel.HEADING_3,
        children: parseInlineRuns(el),
      }));
    } else if (tag === 'p') {
      paragraphs.push(new Paragraph({
        children: parseInlineRuns(el),
      }));
    } else if (tag === 'ul' || 
               tag === 'ol') {
      el.querySelectorAll('li')
        .forEach(li => {
          paragraphs.push(new Paragraph({
            bullet: tag === 'ul' 
              ? { level: 0 } 
              : undefined,
            numbering: tag === 'ol'
              ? { 
                  reference: 'default-numbering', 
                  level: 0 
                }
              : undefined,
            children: parseInlineRuns(li),
          }));
        });
    }
  });

  const document = new Document({
    sections: [{ children: paragraphs }],
  });

  return await Packer.toBlob(document);
}
