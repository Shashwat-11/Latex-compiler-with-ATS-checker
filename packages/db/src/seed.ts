import { db } from './client';
import { users, projects, projectSettings, files, resumeTemplates } from './schema/index';
import { randomUUID } from 'node:crypto';
import argon2 from 'argon2';

async function seed() {
  console.log('🌱 Seeding database...');

  // Clean existing data
  await db.delete(files);
  await db.delete(projectSettings);
  await db.delete(projects);
  await db.delete(users);

  // Demo user
  const demoUserId = randomUUID();
  await db.insert(users).values({
    id: demoUserId,
    email: 'demo@overleaf.local',
    passwordHash: await argon2.hash('password123', { type: argon2.argon2id }),
    name: 'Demo User',
    emailVerifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`  ✅ Created demo user: demo@overleaf.local / password123`);

  // Guest user — no login needed
  const guestUserId = randomUUID();
  await db.insert(users).values({
    id: guestUserId,
    email: 'guest@overleaf.local',
    passwordHash: await argon2.hash('guest', { type: argon2.argon2id }),
    name: 'Guest',
    emailVerifiedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`  ✅ Created guest user: guest@overleaf.local / guest`);

  // Resume project — simple self-contained, no custom .sty
  const resumeProjectId = randomUUID();
  await db.insert(projects).values({
    id: resumeProjectId, ownerId: demoUserId, name: 'Resume 2026',
    description: 'My professional resume built with LaTeX',
    createdAt: new Date(), updatedAt: new Date(),
  });
  await db.insert(projectSettings).values({
    projectId: resumeProjectId, compiler: 'pdflatex', autoCompile: true,
    createdAt: new Date(), updatedAt: new Date(),
  });

  const resumeMainId = randomUUID();
  await db.insert(files).values({
    id: resumeMainId, projectId: resumeProjectId, parentId: null,
    name: 'main.tex', type: 'file', sortOrder: 0, sizeBytes: 0,
    createdAt: new Date(), updatedAt: new Date(),
    content: `\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=0.75in]{geometry}
\\usepackage{hyperref}
\\usepackage{enumitem}
\\setlist[itemize]{topsep=2pt,itemsep=2pt,leftmargin=18pt,label=\\textbullet}
\\hypersetup{colorlinks=true,linkcolor=blue,urlcolor=blue}
\\pagestyle{empty}

\\begin{document}

\\begin{center}
{\\Huge\\textbf{Jane Doe}}\\\\[0.2em]
\\href{mailto:jane.doe@email.com}{jane.doe@email.com} $|$ (555) 123-4567 $|$ \\href{https://linkedin.com/in/janedoe}{LinkedIn} $|$ \\href{https://github.com/janedoe}{GitHub}
\\end{center}

\\section*{Professional Summary}
Results-driven software engineer with 5+ years of experience building scalable web applications. Passionate about clean code, automated testing, and mentoring junior developers.

\\section*{Experience}
\\textbf{Senior Software Engineer} \\hfill \\textit{TechCorp Inc.} \\hfill Jan 2023 -- Present
\\begin{itemize}
  \\item Led migration to microservices architecture, reducing deployment time by 60\\%
  \\item Designed real-time data processing pipeline handling 1M+ events/day
  \\item Mentored 4 junior engineers through code reviews and pair programming
  \\item Reduced infrastructure costs by 35\\% through cloud optimization
\\end{itemize}

\\textbf{Software Engineer} \\hfill \\textit{StartupXYZ} \\hfill Jun 2020 -- Dec 2022
\\begin{itemize}
  \\item Built core API serving 100K+ daily active users with 99.9\\% uptime
  \\item Implemented CI/CD pipelines reducing release cycle from 2 weeks to daily
  \\item Developed internal tool that automated 80\\% of manual QA processes
\\end{itemize}

\\section*{Education}
\\textbf{B.S. Computer Science} \\hfill \\textit{State University} \\hfill 2016 -- 2020
\\begin{itemize}
  \\item GPA: 3.8/4.0, Dean's List (6 semesters)
  \\item Senior Capstone: Built real-time collaborative code editor using CRDT
\\end{itemize}

\\section*{Technical Skills}
\\textbf{Languages:} TypeScript, JavaScript, Python, Go, SQL \\\\
\\textbf{Frontend:} React, Next.js, Tailwind CSS, GraphQL \\\\
\\textbf{Backend:} Node.js, Fastify, PostgreSQL, Redis, Docker \\\\
\\textbf{Cloud:} AWS (ECS, RDS, S3, Lambda), Terraform, Kubernetes

\\end{document}`,
  });

  console.log(`  ✅ Created Resume 2026 project`);

  // Research paper project (minimal)
  const paperProjectId = randomUUID();
  await db.insert(projects).values({
    id: paperProjectId,
    ownerId: demoUserId,
    name: 'Research Paper',
    description: 'Academic research paper on distributed systems',
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(projectSettings).values({
    projectId: paperProjectId,
    compiler: 'pdflatex',
    autoCompile: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await db.insert(files).values([
    {
      id: randomUUID(),
      projectId: paperProjectId,
      parentId: null,
      name: 'paper.tex',
      type: 'file',
      content: `\\documentclass[12pt,a4paper]{article}
\\usepackage{graphicx}
\\usepackage{amsmath}

\\title{Distributed Consensus in Edge Computing Environments}
\\author{Jane Doe \\and John Smith}
\\date{\\today}

\\begin{document}
\\maketitle

\\begin{abstract}
This paper examines the challenges of achieving distributed consensus in edge computing environments with intermittent connectivity. We propose a novel algorithm that extends the Raft consensus protocol to handle network partitions common in IoT and edge deployments.
\\end{abstract}

\\section{Introduction}
Edge computing has emerged as a critical paradigm for reducing latency in IoT applications. However, maintaining data consistency across geographically distributed edge nodes presents unique challenges that traditional consensus algorithms were not designed to address.

\\section{Related Work}
\\subsection{Raft Consensus}
The Raft consensus algorithm provides a more understandable alternative to Paxos while maintaining strong consistency guarantees in reliable network conditions.

\\subsection{Edge Computing Challenges}
Edge environments exhibit high latency variability, frequent network partitions, and resource constraints that violate the assumptions of traditional consensus protocols.

\\begin{thebibliography}{99}

\\bibitem{ongaro2014raft}
D. Ongaro and J. Ousterhout,
\\textit{In Search of an Understandable Consensus Algorithm},
USENIX Annual Technical Conference, 2014.

\\bibitem{shi2016edge}
W. Shi, J. Cao, Q. Zhang, Y. Li, and L. Xu,
\\textit{Edge Computing: Vision and Challenges},
IEEE Internet of Things Journal, vol. 3, no. 5, pp. 637--646, 2016.

\\end{thebibliography}
\\end{document}`,
      sortOrder: 0,
      sizeBytes: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      projectId: paperProjectId,
      parentId: null,
      name: 'bibliography.bib',
      type: 'file',
      content: `@article{ongaro2014raft,
  title={In Search of an Understandable Consensus Algorithm},
  author={Ongaro, Diego and Ousterhout, John},
  journal={USENIX Annual Technical Conference},
  year={2014}
}

@article{shi2016edge,
  title={Edge Computing: Vision and Challenges},
  author={Shi, Weisong and Cao, Jie and Zhang, Quan and Li, Youhuizi and Xu, Lanyu},
  journal={IEEE Internet of Things Journal},
  volume={3},
  number={5},
  pages={637--646},
  year={2016}
}`,
      sortOrder: 1,
      sizeBytes: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: randomUUID(),
      projectId: paperProjectId,
      parentId: null,
      name: 'figures',
      type: 'folder',
      content: null,
      sortOrder: 2,
      sizeBytes: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]);

  console.log(`  ✅ Created Research Paper project with 3 files (including figures/ folder)`);

  // Guest user project
  const guestProjectId = randomUUID();
  await db.insert(projects).values({ id: guestProjectId, ownerId: guestUserId, name: 'Quick Start', description: 'Get started with LaTeX', createdAt: new Date(), updatedAt: new Date() });
  await db.insert(projectSettings).values({ projectId: guestProjectId, compiler: 'pdflatex', autoCompile: true, createdAt: new Date(), updatedAt: new Date() });
  await db.insert(files).values({ id: randomUUID(), projectId: guestProjectId, parentId: null, name: 'main.tex', type: 'file', content: `\\documentclass[12pt,a4paper]{article}\n\n\\title{My First Document}\n\\author{Guest}\n\\date{\\today}\n\n\\begin{document}\n\\maketitle\n\n\\section{Introduction}\nStart writing your LaTeX document here!\n\n\\end{document}`, sortOrder: 0, sizeBytes: 0, createdAt: new Date(), updatedAt: new Date() });
  console.log(`  ✅ Created guest project: Quick Start`);

  // Seed resume templates
  const templateData: Array<{
    name: string;
    slug: string;
    description: string;
    category: string;
    latexClass: string;
    compiler: string;
    styleOptions: Record<string, string[]>;
    templateFiles: Array<{ filename: string; content: string }>;
    isActive: boolean;
  }> = [
    {
      name: 'Modern CV',
      slug: 'moderncv',
      description: 'A clean, modern CV template with multiple style and color options. Suitable for professionals and academics.',
      category: 'professional',
      latexClass: 'moderncv',
      compiler: 'pdflatex',
      styleOptions: {
        styles: ['classic', 'casual', 'banking', 'oldstyle', 'fancy'],
        colors: ['blue', 'green', 'red', 'purple', 'grey', 'orange', 'black', 'burgundy'],
      },
      templateFiles: [
        {
          filename: 'main.tex',
          content: `\\documentclass[11pt,a4paper,sans]{moderncv}
\\moderncvstyle{%%STYLE%%}
\\moderncvcolor{%%COLOR%%}

\\name{%%FIRSTNAME%%}{%%LASTNAME%%}
\\title{%%TITLE%%}
\\phone[mobile]{%%PHONE%%}
\\email{%%EMAIL%%}
\\social[linkedin]{%%LINKEDIN%%}
\\social[github]{%%GITHUB%%}

\\begin{document}
\\makecvtitle

%%EDUCATION%%

%%EXPERIENCE%%

%%SKILLS%%

%%PROJECTS%%
\\end{document}`
        },
        {
          filename: 'moderncv.cls',
          content: `%% moderncv.cls placeholder — install from CTAN`,
        },
      ],
      isActive: true,
    },
    {
      name: 'Two-Column Resume',
      slug: 'altacv',
      description: 'A modern two-column layout with sidebar for skills and contact information.',
      category: 'professional',
      latexClass: 'altacv',
      compiler: 'pdflatex',
      styleOptions: {
        colors: ['#002B5B', '#333333'],
      },
      templateFiles: [
        {
          filename: 'main.tex',
          content: `\\documentclass[10pt,a4paper,ragged2e]{altacv}
\\definecolor{accent}{HTML}{%%ACCENT_COLOR%%}

\\name{%%FIRSTNAME%%}{%%LASTNAME%%}
\\tagline{%%TITLE%%}
\\personalinfo{%%PERSONAL_INFO%%}

\\begin{document}
\\makecvheader

\\begin{paracol}{2}
%%EDUCATION%%
\\switchcolumn
%%SKILLS%%
\\end{paracol}
\\end{document}`
        },
      ],
      isActive: true,
    },
    {
      name: 'Simple Resume',
      slug: 'simple-resume',
      description: 'A minimal, ATS-friendly single-column resume using standard LaTeX article class.',
      category: 'minimal',
      latexClass: 'article',
      compiler: 'pdflatex',
      styleOptions: {},
      templateFiles: [
        {
          filename: 'main.tex',
          content: `\\documentclass[11pt,letterpaper]{article}
\\usepackage{hyperref}
\\usepackage{geometry}
\\geometry{margin=1in}

\\begin{document}
\\begin{center}
{\\Huge \\bfseries %%FIRSTNAME%% \\textunderscore %%LASTNAME%%} \\\\
%%EMAIL%% $\\mid$ %%PHONE%% $\\mid$ \\href{%%LINKEDIN%%}{LinkedIn}
\\end{center}

%%SUMMARY%%

%%EDUCATION%%

%%EXPERIENCE%%

%%SKILLS%%
\\end{document}`
        },
      ],
      isActive: true,
    },
    {
      name: 'Awesome CV',
      slug: 'awesome-cv',
      description: 'A stylish CV template with icon-based header and clean section layout. Requires XeLaTeX.',
      category: 'creative',
      latexClass: 'awesome-cv',
      compiler: 'xelatex',
      styleOptions: {
        colors: ['#002B5B', '#cc0000', '#0073b7', '#005A9C'],
      },
      templateFiles: [
        {
          filename: 'main.tex',
          content: `\\documentclass[11pt,letterpaper]{awesome-cv}

\\name{%%FIRSTNAME%%}{%%LASTNAME%%}
\\position{%%TITLE%%}
\\email{%%EMAIL%%}
\\phone{%%PHONE%%}
\\linkedin{%%LINKEDIN%%}
\\github{%%GITHUB%%}

\\begin{document}
\\makecvheader
\\makecvfooter

%%EDUCATION%%
%%EXPERIENCE%%
%%SKILLS%%
\\end{document}`
        },
      ],
      isActive: true,
    },
  ];

  for (const tpl of templateData) {
    await db.insert(resumeTemplates).values(tpl).onConflictDoNothing();
  }
  console.log(`  - ${templateData.length} resume templates seeded`);

  console.log('');
  console.log('🌱 Seeding complete!');
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  });
