#!/usr/bin/env node

/**
 * EJS Template Processor
 * Converts EJS templates to static HTML files before Vite build
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import ejs from 'ejs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SRC_DIR = path.join(__dirname, '../src-modern');
const COMPONENTS_DIR = path.join(SRC_DIR, 'components');

async function processTemplate(templateFile, pageData) {
  try {
    const layoutPath = path.join(COMPONENTS_DIR, 'layout.ejs');
    const layout = await fs.readFile(layoutPath, 'utf-8');

    // Read the page EJS file
    const pagePath = path.join(SRC_DIR, templateFile);
    const pageContent = await fs.readFile(pagePath, 'utf-8');

    // Check if this is a standalone template (like asset.ejs)
    const isStandalone = pageContent.includes('<!DOCTYPE html>');

    if (isStandalone) {
      // For standalone templates, just replace .ejs with .html
      const htmlFile = templateFile.replace('.ejs', '.html');
      const htmlPath = path.join(SRC_DIR, htmlFile);
      await fs.writeFile(htmlPath, pageContent, 'utf-8');
      console.log(`✅ Processed ${templateFile} → ${htmlFile}`);
      return;
    }

    // Extract page variables (title, page)
    const variables = {};
    const varMatches = pageContent.match(/<% const (\w+) = '([^']+)'; %>/g) || [];
    varMatches.forEach((match) => {
      const [, key, value] = match.match(/<% const (\w+) = '([^']+)'; %>/);
      variables[key] = value;
    });

    // Remove variable declarations from page content
    const cleanContent = pageContent.replace(/<% const .* %>\n?/g, '').trim();

    // Process the page content through EJS to handle includes
    const processedContent = ejs.render(
      cleanContent,
      {},
      {
        filename: pagePath,
        rmWhitespace: false,
        views: [COMPONENTS_DIR],
      }
    );
    variables.content = processedContent;

    // Render the template
    const html = ejs.render(layout, variables, {
      filename: layoutPath,
      rmWhitespace: false,
      views: [COMPONENTS_DIR],
    });

    // Write to HTML file
    const htmlFile = templateFile.replace('.ejs', '.html');
    const htmlPath = path.join(SRC_DIR, htmlFile);
    await fs.writeFile(htmlPath, html, 'utf-8');

    console.log(`✅ Processed ${templateFile} → ${htmlFile}`);
  } catch (err) {
    console.error(`❌ Error processing ${templateFile}:`, err.message);
    throw err;
  }
}

async function main() {
  try {
    console.log('🔨 Building EJS templates...\n');

    await Promise.all([
      processTemplate('index.ejs', { title: 'Dashboard', page: 'dashboard' }),
      processTemplate('inventory.ejs', { title: 'Inventory', page: 'inventory' }),
      processTemplate('marketplace.ejs', { title: 'Marketplace', page: 'marketplace' }),
      processTemplate('retailers.ejs', { title: 'Retailers', page: 'retailers' }),
      processTemplate('settings.ejs', { title: 'Settings', page: 'settings' }),
      processTemplate('data-management.ejs', { title: 'Data & Backup', page: 'data-management' }),
    ]);

    console.log('\n✅ All EJS templates processed successfully!');
  } catch (err) {
    process.exit(1);
  }
}

main();
