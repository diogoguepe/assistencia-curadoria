import { Book } from '../types';

export const CATALOG: Book[] = [
  {
    id: "1",
    title: "O Algoritmo da Emoção",
    author: "Sofia Mendes",
    genre: "Ficção Científica / Tech-Thriller",
    targetAudience: "Adulto / Fãs de Ficção Científica Moderna",
    publicationYear: 2025,
    synopsis: "Em um futuro próximo, uma engenheira de software brasileira descobre uma falha bizarra em um modelo de IA conversacional ultra-avançado: o modelo começou a simular empatia genuína, mas apenas quando debatendo literatura clássica. Um thriller elegante que aborda a humanidade atrás dos bytes.",
    price: 64.90,
    pages: 320,
    isbn: "978-85-1234-567-1",
    tags: ["inteligência artificial", "tecnologia", "suspense", "ficção brasileira"],
    marketingHooks: [
      "Perfeito para leitores de Isaac Asimov e fãs de Black Mirror.",
      "Aborda dilemas éticos reais da IA de forma literária e acessível."
    ],
    coverColor: "from-blue-900 to-indigo-950 text-sky-200"
  },
  {
    id: "2",
    title: "Machine Learning Prático: Sistemas Inteligentes",
    author: "Dr. Arthur Rocha",
    genre: "Tecnologia / Ensino Técnico",
    targetAudience: "Profissional / Estudantes de Tecnologia",
    publicationYear: 2024,
    synopsis: "Um guia definitivo e prático para entender as fundações matemáticas e de programação das ferramentas de inteligência artificial de hoje. Focado em aplicação real, criação de agentes autônomos e arquiteturas de LLMs sem o jargão impenetrável acadêmico.",
    price: 119.00,
    pages: 450,
    isbn: "978-85-1234-567-2",
    tags: ["inteligência artificial", "tecnologia", "ensino técnico", "ciência de dados"],
    marketingHooks: [
      "Livro mais adotado em faculdades brasileiras de ciência de computação em 2025.",
      "Inclui acesso exclusivo a um repositório com setups passo a passo."
    ],
    coverColor: "from-zinc-800 to-slate-900 text-teal-400"
  },
  {
    id: "3",
    title: "A Floresta dos Mistérios Acesos",
    author: "Clara Peixoto",
    genre: "Literatura Infantojuvenil",
    targetAudience: "Crianças de 6 a 10 anos",
    publicationYear: 2025,
    synopsis: "No topo de uma montanha nebulosa no sul do Brasil, as árvores começam a brilhar com luz própria durante a primavera. O jovem Luan e seu cão farejador embarcam em uma jornada para descobrir se as luzes vêm de pirilampos mágicos ou de um segredo ecológico esquecido.",
    price: 49.90,
    pages: 112,
    isbn: "978-85-1234-567-3",
    tags: ["infantil", "natureza", "mistério", "aventura"],
    marketingHooks: [
      "Ilustrações completas em aquarela e projeto gráfico especial ecologicamente correto.",
      "Excelente para leitura compartilhada entre pais e filhos antes de dormir."
    ],
    coverColor: "from-emerald-800 to-green-950 text-emerald-200"
  },
  {
    id: "4",
    title: "Pipoca, o Coelho Aventuroso",
    author: "Tio Gustavo",
    genre: "Literatura Infantil",
    targetAudience: "Crianças de 3 a 5 anos",
    publicationYear: 2026,
    synopsis: "Pipoca adora saltar mais alto que todos os seus irmãos, mas um dia ele acidentalmente cai no cesto de vime de um balão de ar quente prestes a decolar. Acompanhe a graciosa jornada de Pipoca vendo o mundo lá de cima e aprendendo que voltar para casa é o melhor pouso do mundo.",
    price: 39.90,
    pages: 32,
    isbn: "978-85-1234-567-4",
    tags: ["infantil", "ilustrado", "animais", "novidade"],
    marketingHooks: [
      "O livro mais pedido em creches e escolas de educação infantil no primeiro semestre de 2026.",
      "Livro com páginas cartonadas duráveis, perfeito para manuseio de bebês e crianças pequenas."
    ],
    coverColor: "from-amber-400 to-orange-500 text-stone-900"
  },
  {
    id: "5",
    title: "Corações sob o Céu de Outono",
    author: "Mariana Alencar",
    genre: "Romance Literário",
    targetAudience: "Jovem Adulto / Adulto",
    publicationYear: 2025,
    synopsis: "Dois restauradores de livros antigos são contratados para recuperar o acervo inundado de uma biblioteca centenária em Ouro Preto. Entre páginas carcomidas pelo tempo e anotações misteriosas nas margens de manuscritos do século XVIII, floresce um amor improvável marcado por cartas nunca enviadas.",
    price: 58.00,
    pages: 288,
    isbn: "978-85-1234-567-5",
    tags: ["romance", "literatura brasileira", "drama", "ouro preto"],
    marketingHooks: [
      "Ideal para clubes de leitura e leitores de ficção sentimental poética e histórica.",
      "Best-seller instantâneo no TikTok do público BookTok brasileiro."
    ],
    coverColor: "from-rose-800 to-amber-950 text-rose-100"
  },
  {
    id: "6",
    title: "O Último Café em Paris",
    author: "Julian Dubois",
    genre: "Romance Literário",
    targetAudience: "Adulto",
    publicationYear: 2024,
    synopsis: "Um romance que reconstrói a vibrante cena intelectual parisiense do final dos anos 1960 através dos olhos de um jovem exilado brasileiro que trabalha lavando pratos no emblemático Café de Flore. Um livro sobre nostalgia, encontros fortuitos e o peso dos sonhos não realizados.",
    price: 62.00,
    pages: 340,
    isbn: "978-85-1234-567-6",
    tags: ["romance", "paris", "exílio", "anos 60"],
    marketingHooks: [
      "Atrai leitores nostálgicos da Bossa Nova, cinema clássico e revoluções contraculturais.",
      "Prosa elegante que lembra os grandes romances clássicos de formação francesas."
    ],
    coverColor: "from-neutral-700 to-indigo-900 text-yellow-300"
  },
  {
    id: "7",
    title: "Ecos de um Passado Distante",
    author: "Helena Ramos",
    genre: "Romance Histórico",
    targetAudience: "Adulto / Fãs de História",
    publicationYear: 2025,
    synopsis: "Um mergulho fascinante no Brasil colonial do início do século XIX, acompanhando a saga de uma herdeira contestadora que se nega a aceitar casamentos arranjados e usa os jornais satíricos do Rio de Janeiro, sob pseudônimo masculino, para advogar pela libertação das mentes livres.",
    price: 69.90,
    pages: 412,
    isbn: "978-85-1234-567-7",
    tags: ["romance", "histórico", "feminismo", "rio de janeiro"],
    marketingHooks: [
      "Uma pesquisa histórica impecável aliada a uma narrativa ágil cheia de conspirações.",
      "Recomendado para leitores de romances épicos de época com forte liderança feminina."
    ],
    coverColor: "from-amber-800 to-amber-950 text-amber-100"
  },
  {
    id: "8",
    title: "A Arte de Falar na Era Digital",
    author: "Marcelo Antunes",
    genre: "Marketing / Comunicação",
    targetAudience: "Profissional / Corporativo",
    publicationYear: 2025,
    synopsis: "Como as redes sociais de vídeo curto e as videochamadas redefiniram a oratória moderna. Este livro traz técnicas de retórica adaptadas para telas, controle de atenção do público disperso e estratégias de copywriting vocal para profissionais de vendas e de posicionamento de marca.",
    price: 54.90,
    pages: 200,
    isbn: "978-85-1234-567-8",
    tags: ["marketing", "comunicação", "oratoria", "profissional"],
    marketingHooks: [
      "Indispensável para influenciadores digitais, gerentes de marketing e palestrantes do home office.",
      "Direto ao ponto, com exercícios de 5 minutos ao final de cada capítulo."
    ],
    coverColor: "from-violet-900 to-fuchsia-950 text-pink-300"
  },
  {
    id: "9",
    title: "Lançamento Exponencial",
    author: "Patrícia Sampaio",
    genre: "Negócios / Marketing Editorial",
    targetAudience: "Profissionais de Vendas, Autores e Editores",
    publicationYear: 2026,
    synopsis: "O mercado editorial mudou radicalmente nos últimos dois anos. Patrícia apresenta o modelo dos 'Lançamentos Relâmpago', a sinergia com criadores de conteúdo do BookTok, precificação dinâmica e o uso ético da IA para testar conceitos de capas e sinopses de forma automatizada e com baixo investimento.",
    price: 72.00,
    pages: 256,
    isbn: "978-85-1234-567-9",
    tags: ["marketing", "negocios", "editora", "novidade"],
    marketingHooks: [
      "A bíblia por trás das 10 campanhas de financiamento coletivo literário de maior sucesso do país.",
      "Garantia de insights comerciais brutais tanto para publicações físicas quanto digitais."
    ],
    coverColor: "from-blue-600 to-indigo-900 text-teal-200"
  },
  {
    id: "10",
    title: "A Pequena Estrela sem Brilho",
    author: "Beatriz Lima",
    genre: "Literatura Infantil",
    targetAudience: "Crianças de 4 a 7 anos",
    publicationYear: 2025,
    synopsis: "Estela era a menor estrela da constelação do Cruzeiro do Sul e sofria porque suas pontas eram douradas demais, mas seu centro era fosco, sem emitir feixe algum. Com a ajuda de um cometa tagarela e uma coruja astrônoma, ela descobre que seu brilho especial não se vê de longe, mas sim quando guia marinheiros perdidos no nevoeiro.",
    price: 45.00,
    pages: 40,
    isbn: "978-85-1234-567-10",
    tags: ["infantil", "autoestima", "astronomia", "apoio socioemocional"],
    marketingHooks: [
      "Aborda temas delicados como autoestima, inclusão e propósito de vida focado em crianças de forma poética.",
      "Vencedor da menção honrosa do prêmio de ilustrações literárias de 2025."
    ],
    coverColor: "from-cyan-900 to-sky-950 text-amber-300"
  },
  {
    id: "11",
    title: "IA e o Futuro do Trabalho",
    author: "Renato Costa",
    genre: "SaaS / Ensino Profissional / Carreira",
    targetAudience: "Profissionais liberais, líderes e empreendedores",
    publicationYear: 2025,
    synopsis: "Uma análise lúcida sobre as carreiras que estão sendo transformadas profundamente pela IA generativa. Longe do tom apocalíptico, Renato Costa apresenta caminhos concretos para redesenhar rotinas de trabalho utilizando copilotos digitais e desenvolvendo as competências puramente humanas.",
    price: 59.90,
    pages: 224,
    isbn: "978-85-1234-567-11",
    tags: ["inteligência artificial", "tecnologia", "carreira", "negocios"],
    marketingHooks: [
      "Ideal para palestras corporativas e programas de treinamento interno sobre transformação digital.",
      "Apresenta 15 modelos de prompts prontos para automatizar tarefas administrativas maçantes."
    ],
    coverColor: "from-slate-705 to-zinc-900 text-sky-400"
  },
  {
    id: "12",
    title: "A Revolução do No-Code",
    author: "Vanessa Dias",
    genre: "Tecnologia / Empreendedorismo",
    targetAudience: "Marcas, Designers e Futuros Desenvolvedores",
    publicationYear: 2024,
    synopsis: "Como construir MVPs funcionais de softwares, automações empresariais robustas e sites de vendas interativos sem escrever uma única linha de código. Traz um panorama sobre ferramentas como Zapier, Make, Bubble, Webflow e integrações com APIs de IA para criar soluções corporativas ágeis em equipes enxutas.",
    price: 79.90,
    pages: 310,
    isbn: "978-85-1234-567-12",
    tags: ["tecnologia", "empreendedorismo", "no-code", "SaaS"],
    marketingHooks: [
      "Excelente para acelerar e baratear a inovação empresarial dentro de pequenas e grandes empresas.",
      "Estudos de caso reais de startups brasileiras que validaram ideias de milhões de reais em duas semanas."
    ],
    coverColor: "from-fuchsia-800 to-purple-950 text-yellow-200"
  },
  {
    id: "13",
    title: "O Segredo da Quinta da Colina",
    author: "Artur de Souza",
    genre: "Suspense / Romance",
    targetAudience: "Adulto / Fãs de Thriller de Mistério Clássico",
    publicationYear: 2025,
    synopsis: "Uma mansão isolada no interior paulista que pertence à mesma família tradicional do café há gerações. Quando o patriarca decide alienar o patrimônio, uma série de desabamentos inexplicáveis expõe túneis coloniais subterrâneos e segredos de antigos testamentos que prometem dividir ricas dinastias regionais.",
    price: 65.00,
    pages: 360,
    isbn: "978-85-1234-567-13",
    tags: ["mistério", "suspense", "interior", "tradição"],
    marketingHooks: [
      "Narrativa intrincada contada em duas linhas do tempo paralelas enriquecedoras.",
      "Excelente para amantes de Agatha Christie e thrillers de mistérios de fazenda e casarões."
    ],
    coverColor: "from-red-900 to-stone-950 text-orange-200"
  },
  {
    id: "14",
    title: "Poesias da Terra e do Mar",
    author: "Gabriela Mistral Neto",
    genre: "Lírica / Poesia Brasileira",
    targetAudience: "Público Geral / Amantes de Poesia",
    publicationYear: 2024,
    synopsis: "Uma belíssima coletânea de sonetos modernos e versos livres que cantam as paisagens físicas do extenso litoral brasileiro, as dores do êxodo rural e a serenidade melancólica de quem tem raízes cravadas tanto nas areias litorâneas quanto na terra vermelha e rochosa das plantações mineiras.",
    price: 42.00,
    pages: 128,
    isbn: "978-85-1234-567-14",
    tags: ["poesia", "lyrica", "litoral", "brasil"],
    marketingHooks: [
      "Uma edição com capa texturizada e ilustrações em linogravura, um verdadeiro item de colecionador.",
      "Perfeito para aficionados em literatura lírica calma, contemplativa e intimista."
    ],
    coverColor: "from-sky-800 to-slate-900 text-orange-100"
  },
  {
    id: "15",
    title: "Fórmula do Best-seller",
    author: "Frederico Cabral",
    genre: "Comercial / Escrita Criativa",
    targetAudience: "Editores, Escritores Indie e Agentes Literários",
    publicationYear: 2025,
    synopsis: "O que blocos de construção narrativos modernos e dados de engajamento em plataformas de e-books revelam sobre os hábitos de leitura do século XXI. Um livro incisivo que ensina a estruturar ritmos de clímax, equilibrar diálogos e montar ofertas comerciais de lançamento que chamam a atenção da grande mídia.",
    price: 68.00,
    pages: 240,
    isbn: "978-85-1234-567-15",
    tags: ["escrita", "marketing", "negocios", "editora"],
    marketingHooks: [
      "Desvenda os segredos algorítmicos por trás da lista de mais vendidos da Amazon Brasil.",
      "Ideal para profissionais do editorial refinarem os ganchos nas contra-capas dos livros mais difíceis."
    ],
    coverColor: "from-emerald-900 to-indigo-950 text-yellow-300"
  },
  {
    id: "16",
    title: "Diário Secreto de um Astronauta",
    author: "Pedro Santos",
    genre: "Ficção Científica Infantil",
    targetAudience: "Crianças de 8 a 12 anos",
    publicationYear: 2026,
    synopsis: "Leo tem 11 anos e jurou segredo absoluto. Ele foi secretamente recrutado para testar o primeiro acampamento espacial de férias na órbita terrestre média. Escrito em formato de diário interativo, com rabiscos, fórmulas espaciais malucas e piadas sobre gravidade zero, este livro diverte ao mesmo tempo que aborda física elemental.",
    price: 52.00,
    pages: 176,
    isbn: "978-85-1234-567-16",
    tags: ["infantil", "ficção científica", "espacial", "novidade"],
    marketingHooks: [
      "Formato dinâmico super recomendado para crianças com dificuldade de engajamento em leitura de bloco de texto texturizado.",
      "Estimula o interesse por disciplinas STEM de maneira divertida e orgânica."
    ],
    coverColor: "from-indigo-950 to-purple-900 text-sky-300"
  },
  {
    id: "17",
    title: "Finanças para Mentes Simples",
    author: "Roberto Amado",
    genre: "Finanças Pessoais / Educação",
    targetAudience: "Jovens Adultos / Iniciantes em Planejamento",
    publicationYear: 2025,
    synopsis: "Sem gráficos de planilhas cinzas de Wall Street ou terminologias bancárias maldosas. Roberto explica o funcionamento dos juros compostos, cartões de crédito alternativos modernos e as armadilhas emocionais do consumo fútil através de metáforas hilárias e esquemas visuais direto ao cérebro.",
    price: 49.90,
    pages: 208,
    isbn: "978-85-1234-567-17",
    tags: ["finanças", "carreira", "educação", "jovens"],
    marketingHooks: [
      "O presente número um que pais dão aos filhos que se mudam de casa pela primeira vez.",
      "Enfatiza inteligência emocional e hábitos saudáveis ao invés de ficar obcecado por cortes de café."
    ],
    coverColor: "from-neutral-850 to-neutral-950 text-green-400"
  },
  {
    id: "18",
    title: "A Jornada do Leitor na Escola",
    author: "Luiza Vasconcellos",
    genre: "Educação / Ensino de Literatura",
    targetAudience: "Educadores, Diretores e Pedagogos",
    publicationYear: 2025,
    synopsis: "A pedagoga e editora Luiza propõe uma metodologia inovadora e prática para reviver o prazer de ler em ambientes de ensino fundamental e médio. Repleto de roteiros de clubes de leitura dinâmicos, gincanas literárias gamificadas e formas criativas de integrar textos clássicos com a cultura pop digital dos adolescentes.",
    price: 56.00,
    pages: 192,
    isbn: "978-85-1234-567-18",
    tags: ["educação", "pedagogia", "clube de leitura", "professores"],
    marketingHooks: [
      "Adotado por secretarias de ensino municipais inovadoras para capacitação de auxiliares pedagógicos.",
      "Oferece soluções práticas para afastar alunos das telas e engajá-los na leitura de livros físicos."
    ],
    coverColor: "from-teal-850 to-teal-950 text-indigo-200"
  },
  {
    id: "19",
    title: "Sustentabilidade Urbana: Ecologia",
    author: "Laura Nunes",
    genre: "Arquitetura / Urbanismo",
    targetAudience: "Acadêmicos / Profissionais de Gestão Pública",
    publicationYear: 2024,
    synopsis: "Uma profunda investigação técnica sobre os edifícios verdes no Brasil e no exterior. O livro aborda o uso correto de materiais regionais, captação passiva de água pluvial, corredores verdes urbanos de ciclovias e as novas diretrizes de governança ESG para grandes construtoras e incorporadoras imobiliárias.",
    price: 98.00,
    pages: 320,
    isbn: "978-85-1234-567-19",
    tags: ["ecologia", "sustentabilidade", "urbanismo", "arquitetura"],
    marketingHooks: [
      "Abordagem realista do cenário regulatório brasileiro com farto material fotográfico e esquemas técnicos.",
      "Premiado mundialmente em fórum de descarbonização e infraestrutura inteligente sustentável."
    ],
    coverColor: "from-stone-900 to-emerald-950 text-lime-300"
  },
  {
    id: "20",
    title: "Cozinha Intuitiva: Sabor e Prática",
    author: "Chef Bruno Reis",
    genre: "Gastronomia / Prático",
    targetAudience: "Público Geral",
    publicationYear: 2025,
    synopsis: "Esqueça balanças de precisão para gramas e ingredientes raros importados. Bruno incentiva o cozinheiro doméstico a confiar no tato, olfato e audição para criar pratos incríveis. Aprenda a equilibrar acidez, doçura e picância em minutos com o que já tem na geladeira de casa de segunda a sexta.",
    price: 64.00,
    pages: 220,
    isbn: "978-85-1234-567-20",
    tags: ["gastronomia", "cozinha", "prático", "vida-saudável"],
    marketingHooks: [
      "Ilustrado com fluxogramas mentais ao invés de receitas clássicas engessadas.",
      "Perfeito para quem trabalha fora e quer comer comida de verdade deliciosa e saudável sem complicação."
    ],
    coverColor: "from-orange-850 to-amber-955 text-amber-200"
  }
];
