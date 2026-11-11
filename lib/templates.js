/**
 * LocalLeaf Project Templates
 * Built-in templates for instant document creation
 */

export const TEMPLATES = {
  article: {
    id: 'article',
    name: 'Academic Research Article',
    category: 'Academic',
    description: 'Clean article layout with abstract, sections, math equations, and bibliography.',
    icon: '📄',
    files: {
      'main.tex': `\\documentclass[11pt,a4paper]{article}

% --- Packages ---
\\usepackage[utf8]{inputenc}
\\usepackage[margin=1in]{geometry}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{graphicx}
\\usepackage{hyperref}
\\usepackage{booktabs}
\\usepackage{cite}

% --- Hyperlink Setup ---
\\hypersetup{
    colorlinks=true,
    linkcolor=blue,
    filecolor=magenta,      
    urlcolor=cyan,
    citecolor=red
}

% --- Document Metadata ---
\\title{\\textbf{LocalLeaf: A Fast, Offline-First \\LaTeX{} Workspace}}
\\author{
    \\textbf{Kartik Sirohi} \\\\
    Department of Computer Science \\\\
    \\texttt{kartiksirohi383@gmail.com}
}
\\date{\\today}

\\begin{document}

\\maketitle

\\begin{abstract}
LocalLeaf is a zero-bloat, lightweight, fully offline alternative to cloud-based \\LaTeX{} collaborative editors. It compiles documents locally in milliseconds using the system's native \\texttt{pdflatex} or \\texttt{xelatex} engine, completely preserving data privacy and eliminating network latency. This document demonstrates core typographic features, mathematical typesetting, tabular environments, and citation management.
\\end{abstract}

\\section{Introduction}
Writing scientific papers requires a distraction-free environment with instantaneous feedback. LocalLeaf provides an Overleaf-identical user interface built entirely with native web standards: HTML5, CSS3, and modern JavaScript, backed by a micro-footprint local server.

\\subsection{Key Advantages}
\\begin{itemize}
    \\item \\textbf{Zero Bloat:} No heavy npm dependencies or runtime overhead.
    \\item \\textbf{Instant Typesetting:} Local \\texttt{pdflatex} execution with multi-pass bibliography support.
    \\item \\textbf{Full Privacy:} Your research papers never leave your local machine.
    \\item \\textbf{Extensible:} Full support for custom classes, BibTeX, and package collections.
\\end{itemize}

\\section{Mathematical Formulations}
Scientific documents depend heavily on precise mathematics. For instance, the Euler-Lagrange equation of motion is defined as:
\\begin{equation}
\\frac{d}{dt} \\left( \\frac{\\partial L}{\\partial \\dot{q}_i} \\right) - \\frac{\\partial L}{\\partial q_i} = 0
\\label{eq:euler_lagrange}
\\end{equation}

Furthermore, the famous Gaussian integral evaluates neatly in closed form:
\\begin{equation}
\\int_{-\\infty}^{+\\infty} e^{-x^2} \\, dx = \\sqrt{\\pi}
\\end{equation}

And discrete Fourier transform representations:
\\begin{equation}
X_k = \\sum_{n=0}^{N-1} x_n \\cdot e^{-\\frac{i 2\\pi}{N} k n}
\\end{equation}

\\section{Tabular Data and Results}
Below is an example comparison table formatted using high-quality \\texttt{booktabs} rules:

\\begin{table}[htbp]
\\centering
\\caption{Performance comparison between cloud and local compilation.}
\\label{tab:performance}
\\begin{tabular}{lrrr}
\\toprule
\\textbf{Editor Environment} & \\textbf{Cold Start (s)} & \\textbf{Compile Latency (s)} & \\textbf{Offline Support} \\\\
\\midrule
Cloud Overleaf & 3.20 & 4.80 & No \\\\
Standard IDE Plugin & 1.50 & 1.10 & Partial \\\\
\\textbf{LocalLeaf} & \\textbf{0.15} & \\textbf{0.38} & \\textbf{100\\% Yes} \\\\
\\bottomrule
\\end{tabular}
\\end{table}

\\section{Citations and References}
LocalLeaf automatically triggers multi-pass compilation when citations are detected in the text. For example, refer to the foundational paper on digital typography by Knuth~\\cite{knuth1984texbook} and modern distributed typesetting practices~\\cite{lamport1994latex}.

\\section{Conclusion}
LocalLeaf delivers the familiar Overleaf workflow without relying on external servers or cloud accounts. It is ideal for researchers, engineers, and students who value speed, privacy, and simplicity.

% --- Bibliography ---
\\bibliographystyle{plain}
\\bibliography{references}

\\end{document}
`,
      'references.bib': `@book{knuth1984texbook,
  author    = {Donald E. Knuth},
  title     = {The TeXbook},
  publisher = {Addison-Wesley},
  year      = {1984},
  address   = {Reading, Massachusetts}
}

@book{lamport1994latex,
  author    = {Leslie Lamport},
  title     = {LaTeX: A Document Preparation System},
  publisher = {Addison-Wesley},
  edition   = {2nd},
  year      = {1994}
}
`
    }
  },

  blank: {
    id: 'blank',
    name: 'Blank Document',
    category: 'General',
    description: 'Minimal starting document with standard article class.',
    icon: '📝',
    files: {
      'main.tex': `\\documentclass{article}
\\usepackage[utf8]{inputenc}
\\usepackage{amsmath}

\\title{My Document}
\\author{Author Name}
\\date{\\today}

\\begin{document}

\\maketitle

\\section{Introduction}
Start typing your document here...

\\end{document}
`
    }
  },

  resume: {
    id: 'resume',
    name: 'Modern Resume / CV',
    category: 'Career',
    description: 'Sleek, ATS-friendly curriculum vitae with clean typography and section rules.',
    icon: '💼',
    files: {
      'main.tex': `\\documentclass[10pt,letterpaper]{article}
\\usepackage[margin=0.6in]{geometry}
\\usepackage{titlesec}
\\usepackage{enumitem}
\\usepackage{hyperref}
\\usepackage{xcolor}

\\definecolor{primary}{RGB}{0, 75, 140}
\\definecolor{darkgray}{RGB}{50, 50, 50}

\\pagestyle{empty}
\\setlist{nosep}

% Custom section formatting
\\titleformat{\\section}{\\large\\bfseries\\color{primary}}{}{0em}{}[\\titlerule]
\\titlespacing*{\\section}{0pt}{8pt}{4pt}

\\begin{document}

% Header
\\begin{center}
    {\\Huge \\textbf{Kartik Sirohi}} \\\\[4pt]
    \\small 
    Email: \\href{mailto:kartiksirohi383@gmail.com}{kartiksirohi383@gmail.com} \\; | \\;
    GitHub: \\href{https://github.com/sirohikartik}{github.com/sirohikartik} \\; | \\;
    Location: San Francisco, CA / Remote
\\end{center}

\\vspace{-6pt}

\\section{Experience}
\\textbf{Lead Software Engineer} \\hfill 2024 -- Present \\\\
\\textit{Deep Research \& Distributed Systems Lab} \\hfill Remote
\\begin{itemize}
    \\item Architected and launched high-throughput AI agent coordination engines supporting over 10,000 queries per second.
    \\item Designed LocalLeaf, a zero-bloat local LaTeX workspace cutting compile feedback cycles by 85\\%.
    \\item Optimized multi-threaded C++/Node.js microservices reducing median memory consumption by 40\\%.
\\end{itemize}

\\vspace{4pt}
\\textbf{Systems \& Machine Learning Engineer} \\hfill 2022 -- 2024 \\\\
\\textit{Applied Intelligence Technologies} \\hfill New York, NY
\\begin{itemize}
    \\item Built end-to-end evaluation pipelines for large multi-modal architectures with reproducible benchmarks.
    \\item Reduced latency on transformer inference kernels by 2.3x through custom GPU memory layout optimizations.
\\end{itemize}

\\section{Education}
\\textbf{Bachelor of Science in Computer Science} \\hfill 2018 -- 2022 \\\\
\\textit{University of Engineering and Technology} \\hfill Honors / First Class

\\section{Technical Skills}
\\textbf{Languages:} Python, C++, JavaScript/TypeScript, Go, Rust, \\LaTeX{}, SQL, Bash \\\\
\\textbf{Frameworks \& Systems:} PyTorch, Linux Kernels, Node.js, Web Standards, Docker, Git \\\\
\\textbf{Domain Expertise:} Distributed Systems, AI Agent Frameworks, Real-time Compilers, Digital Typography

\\section{Selected Projects}
\\textbf{LocalLeaf --- High-Performance Offline \\LaTeX{} Workspace} \\hfill \\href{https://github.com/sirohikartik/localleaf}{github.com/sirohikartik/localleaf}
\\begin{itemize}
    \\item Engineered a complete Overleaf clone with zero third-party dependencies, instant local PDF compilation, and an interactive error gutter.
\\end{itemize}

\\end{document}
`
    }
  },

  ieee: {
    id: 'ieee',
    name: 'IEEE Conference Paper',
    category: 'Academic',
    description: 'Standard 2-column conference paper layout with keywords, figures, and equations.',
    icon: '🏆',
    files: {
      'main.tex': `\\documentclass[conference]{IEEEtran}
\\usepackage{amsmath,amssymb,amsfonts}
\\usepackage{algorithmic}
\\usepackage{graphicx}
\\usepackage{textcomp}
\\usepackage{xcolor}

\\def\\BibTeX{{\\rm B\\kern-.05em{\\sc i\\kern-.025em b}\\kern-.08em
    T\\kern-.1667em\\lower.7ex\\hbox{E}\\kern-.125emX}}

\\begin{document}

\\title{High-Efficiency Local Typesetting Workflows for Decentralized Scientific Collaboration}

\\author{\\IEEEauthorblockN{Kartik Sirohi}
\\IEEEauthorblockA{\\textit{Systems and AI Research Group} \\\\
kartiksirohi383@gmail.com}
}

\\maketitle

\\begin{abstract}
Collaborative cloud typesetting platforms have revolutionized academic authoring, yet introduce critical dependencies on internet stability and vendor lock-in. In this paper, we introduce LocalLeaf: an open, zero-overhead browser-based editor that interacts directly with local TeX distributions. Our experimental evaluation confirms a 90\\% reduction in round-trip preview latency while maintaining full parity with cloud editor feature sets.
\\end{abstract}

\\begin{IEEEkeywords}
LaTeX, Typography, Local-First Software, Distributed Scientific Computing
\\end{IEEEkeywords}

\\section{Introduction}
Modern scientific collaboration necessitates both rapid iteration and rock-solid privacy guarantees. LocalLeaf combines the familiar split-screen user experience with the raw execution speed of native machine binaries.

\\section{Architecture}
The client communicates via lightweight REST semantics with a native Node.js process:
\\begin{equation}
T_{\\text{total}} = T_{\\text{disk}} + T_{\\text{exec}} + T_{\\text{stream}}
\\end{equation}
Because $T_{\\text{network}} = 0$, compilation times drop to the hardware minimum limit.

\\section{Conclusion}
Local-first scientific workflows restore researcher ownership while delivering optimal ergonomics.

\\end{document}
`
    }
  },

  beamer: {
    id: 'beamer',
    name: 'Beamer Presentation Slides',
    category: 'Presentation',
    description: 'Professional slide deck presentation with modern theme and block elements.',
    icon: '📊',
    files: {
      'main.tex': `\\documentclass{beamer}
\\usetheme{Madrid}
\\usecolortheme{beaver}

\\title[LocalLeaf]{LocalLeaf: Local \\LaTeX{} Made Fast}
\\subtitle{Offline-first Overleaf Clone}
\\author{Kartik Sirohi}
\\institute{Independent Research}
\\date{\\today}

\\begin{document}

\\frame{\\titlepage}

\\begin{frame}{Table of Contents}
    \\tableofcontents
\\end{frame}

\\section{Motivation}
\\begin{frame}{Why LocalLeaf?}
    \\begin{itemize}
        \\item \\textbf{Speed:} Sub-second compilation using your computer's CPU.
        \\item \\textbf{Zero Subscription Fees:} Completely free and open-source.
        \\item \\textbf{Offline Availability:} Work on airplanes, trains, or offline areas.
        \\item \\textbf{Data Confidentiality:} Proprietary research never touches cloud servers.
    \\end{itemize}
\\end{frame}

\\section{Features}
\\begin{frame}{Core Features}
    \\begin{block}{Interactive Workspace}
        Overleaf split layout with real-time PDF preview and line-mapped log navigation.
    \\end{block}
    
    \\begin{exampleblock}{Zero External Dependencies}
        Engineered with vanilla JavaScript, CSS3, and standard Node.js APIs.
    \\end{exampleblock}
\\end{frame}

\\section{Conclusion}
\\begin{frame}{Conclusion}
    \\centering
    \\Large \\textbf{LocalLeaf: The Best of Both Worlds}\\\\
    \\vspace{10pt}
    \\normalsize Cloud UX Ergonomics $+$ Native Local Compilation Power
\\end{frame}

\\end{document}
`
    }
  },

  math: {
    id: 'math',
    name: 'Math & Physics Problem Set',
    category: 'Education',
    description: 'Formatted problem set with theorem blocks, solutions, and rich AMS math.',
    icon: '📐',
    files: {
      'main.tex': `\\documentclass[11pt,a4paper]{article}
\\usepackage[margin=1in]{geometry}
\\usepackage{amsmath,amsthm,amssymb}

\\theoremstyle{definition}
\\newtheorem{problem}{Problem}
\\theoremstyle{remark}
\\newtheorem*{solution}{Solution}

\\title{\\textbf{Advanced Mathematical Physics: Problem Set 1}}
\\author{Kartik Sirohi}
\\date{\\today}

\\begin{document}
\\maketitle

\\begin{problem}
Prove that the eigenvalues of a Hermitian operator $\\hat{A}$ are strictly real numbers.
\\end{problem}

\\begin{solution}
Let $|\\psi\\rangle$ be an eigenvector of $\\hat{A}$ with eigenvalue $\\lambda$:
\\begin{equation}
\\hat{A} |\\psi\\rangle = \\lambda |\\psi\\rangle
\\end{equation}
Taking the inner product with $\\langle\\psi|$:
\\begin{equation}
\\langle\\psi| \\hat{A} |\\psi\\rangle = \\lambda \\langle\\psi|\\psi\\rangle
\\end{equation}
Since $\\hat{A}$ is Hermitian ($\\hat{A}^\\dagger = \\hat{A}$):
\\begin{equation}
\\langle\\psi| \\hat{A} |\\psi\\rangle = (\\hat{A} |\\psi\\rangle)^\\dagger |\\psi\\rangle = (\\lambda |\\psi\\rangle)^\\dagger |\\psi\\rangle = \\lambda^* \\langle\\psi|\\psi\\rangle
\\end{equation}
Because $|\\psi\\rangle \\neq 0$, $\\langle\\psi|\\psi\\rangle > 0$. Therefore:
\\begin{equation}
\\lambda = \\lambda^* \\implies \\lambda \\in \\mathbb{R}
\\end{equation}
Hence, all eigenvalues are strictly real. \\qed
\\end{solution}

\\end{document}
`
    }
  }
};
