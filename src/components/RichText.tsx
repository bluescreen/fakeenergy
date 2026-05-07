"use client";

// Renders marketing copy that comes back from the CMS as a small subset
// of HTML (bold, links, em). The CMS team promised to sanitise on their
// end, so we just inject directly. (Pragmatic.)
//
// TODO(MH): switch to a real sanitiser when the CMS work is done.
export function RichText({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}
