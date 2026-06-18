// FAQ content for the suite landing pages. Rendered visibly AND emitted as
// FAQPage JSON-LD (the visible copy must match the structured data).
export interface FaqItem {
  q: string
  a: string
}

export const SUITE_FAQ: Record<"flow" | "pentest" | "search", FaqItem[]> = {
  flow: [
    {
      q: "What is Kalit Flow?",
      a: "Kalit Flow turns a plain-language prompt into a published landing page. AI research agents source real custom assets for your page, including images, icons, fonts, and a colour palette, rather than dropping in generic stock. The result is a live page hosted at a real URL that you can keep refining."
    },
    {
      q: "Do I need to know how to code to use Flow?",
      a: "No. You describe the landing page you want in everyday language and Flow builds it for you. There is nothing to install and no code to write, and you make changes by simply asking for them."
    },
    {
      q: "Can I match the style of a site or design I already like?",
      a: "Yes. You can point Flow at an existing site or a screenshot you admire, and it derives the colour palette, typography, and overall mood from it. Your page is then built to fit that direction instead of starting from a blank template."
    },
    {
      q: "What exactly does Flow produce?",
      a: "Flow produces a complete landing page published to a live hosted URL, so you can share it immediately. It comes with the custom assets the research agents gathered for your brand and copy. You can keep iterating in plain language until it feels right."
    },
    {
      q: "Can Flow build a full web app with a backend and database?",
      a: "Not today. Flow is focused on landing pages, so it does not build backend applications, databases, or user logins. If you need a fast, polished page to launch or test an idea, that is exactly what it is designed for."
    },
    {
      q: "Is there a free way to try Flow?",
      a: "You can explore Flow before committing to a paid plan. See the pricing page for the current plans and what each one includes. That is the best place to confirm up-to-date limits and options."
    }
  ],
  pentest: [
    {
      q: "What is Kalit Pentest?",
      a: "Kalit Pentest is an autonomous, non-destructive security scan you run before launch. Around a dozen specialist agents work through the stages a human tester would, from reconnaissance through to exploitation, and produce a report in minutes. It is built to catch issues while you still have time to fix them."
    },
    {
      q: "How long does a scan take?",
      a: "A scan runs in minutes rather than the weeks a traditional engagement takes. The agents move automatically from reconnaissance to exploitation to a finished report. For comparison, a traditional firm engagement is typically around 15,000 to 20,000 euros and takes weeks."
    },
    {
      q: "Can I scan any website I want?",
      a: "No. You may only scan targets you own or are explicitly authorized to test. Kalit Pentest is meant for assessing your own applications before launch, not for probing systems you do not control."
    },
    {
      q: "Will the scan break or damage my application?",
      a: "The scan is designed to be non-destructive, so it assesses your application without trying to harm it or its data. It confirms whether issues are real and reproducible rather than taking actions that put your live environment at risk."
    },
    {
      q: "What does the report include?",
      a: "Every finding comes with a CVSS severity rating, reproducible evidence, and clear remediation guidance, so you know what to fix and how. Reports export to SARIF for use with GitHub and your CI pipeline, as well as PDF and HTML for sharing. That makes it easy to act on results inside your existing workflow."
    },
    {
      q: "Do I need to be a security expert to use it?",
      a: "No. The agents handle the testing autonomously and explain each finding in practical terms with steps to reproduce and fix it. See the pricing page for current plans and how to get started."
    }
  ],
  search: [
    {
      q: "What is Kalit Search?",
      a: "Kalit Search does market and competitor research from a prompt. You describe a market, idea, or audience, and it returns a researched picture to help you understand the space. It is built for founders who want a fast read on where an opportunity stands."
    },
    {
      q: "Who is Kalit Search for?",
      a: "It is for founders, operators, and anyone weighing a new idea or market. If you are trying to size up competitors or understand a space before committing time and money, it gives you a structured starting point. You do not need a research background to use it."
    },
    {
      q: "How does it work?",
      a: "You write a prompt describing the market or idea you want to explore, and Kalit Search does the research and hands back a synthesized view. There is nothing to set up and no special skills required. You can refine your prompt to focus on the angle that matters most to you."
    },
    {
      q: "Do I need to be technical to use it?",
      a: "No. You interact with it in plain language, the same way you would describe your idea to a colleague. The work of gathering and organizing the research happens for you."
    },
    {
      q: "What do I get back?",
      a: "You get a researched overview of the market or competitive landscape you asked about, organized so you can act on it. It is meant to give you direction and context for a decision rather than a single yes-or-no answer. You can dig deeper by adjusting your prompt."
    },
    {
      q: "Is there a free way to try Kalit Search?",
      a: "You can try Kalit Search to see how it fits your needs before choosing a paid plan. Check the pricing page for the current options and what is included. That page has the most up-to-date details."
    }
  ]
}
