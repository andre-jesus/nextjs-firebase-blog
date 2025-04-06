import SEO from '../components/SEO';
import CodeBlock from '../components/CodeBlock';

export default function MarkdownGuide() {
  return (
    <>
      <SEO 
        title="Markdown Guide"
        description="A guide to using Markdown in your blog posts"
      />
      
      <div className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Markdown Guide</h1>
        
        <div className="prose dark:prose-dark max-w-none bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
          <p>
            This blog uses Markdown for formatting posts. Here's a quick guide to common
            Markdown syntax you can use in your posts.
          </p>
          
          <h2>Basic Formatting</h2>
          
          <CodeBlock 
            language="markdown"
            code={`# Heading 1
## Heading 2
### Heading 3

**Bold text**
*Italic text*
~~Strikethrough~~

> This is a blockquote

- Unordered list item
- Another item
  - Nested item

1. Ordered list item
2. Another item`}
          />
          
          <h2>Links and Images</h2>
          
          <CodeBlock 
            language="markdown"
            code={`[Link text](https://example.com)

![Image alt text](https://example.com/image.jpg)`}
          />
          
          <h2>Code</h2>
          
          <p>Inline code uses single backticks: \`code\`</p>
          
          <p>Code blocks use triple backticks and can include language specification:</p>
          
          <CodeBlock 
            language="markdown"
            code={\`\`\`javascript
function hello() {
  console.log("Hello, world!");
}
\`\`\`}
          />
          
          <h2>Tables</h2>
          
          <CodeBlock 
            language="markdown"
            code={`| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
| Cell 3   | Cell 4   |`}
          />
          
          <h2>Horizontal Rule</h2>
          
          <CodeBlock 
            language="markdown"
            code={`---`}
          />
          
          <h2>Task Lists</h2>
          
          <CodeBlock 
            language="markdown"
            code={`- [x] Completed task
- [ ] Incomplete task
- [ ] Another task`}
          />
          
          <h2>Preview</h2>
          
          <p>
            When writing your post, you can use the preview tab to see how your Markdown
            will be rendered in the published post.
          </p>
          
          <h2>Tips</h2>
          
          <ul>
            <li>Keep headings hierarchical (don't skip from H1 to H3)</li>
            <li>Use blank lines between paragraphs</li>
            <li>For line breaks within a paragraph, end a line with two spaces</li>
            <li>You can embed HTML in your Markdown if needed, but pure Markdown is preferred</li>
          </ul>
          
          <p>
            Happy writing! If you have any questions about using Markdown in your posts,
            feel free to contact us.
          </p>
        </div>
      </div>
    </>
  );
}