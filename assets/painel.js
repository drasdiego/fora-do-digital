(function () {
  "use strict";

  var D = window.DADOS;
  if (!D) {
    var erro = document.getElementById("erro-dados");
    if (erro) erro.hidden = false;
    return;
  }

  var NS = "http://www.w3.org/2000/svg";
  var reduzMovimento = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var DER = D.derivados;
  var ANO_ATUAL = "2025";

  function $(id) {
    return document.getElementById(id);
  }

  function fmt(n, d) {
    d = d === undefined ? 1 : d;
    var partes = Math.abs(n).toFixed(d).split(".");
    var inteiro = partes[0].replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    return (n < 0 ? "-" : "") + inteiro + (partes[1] ? "," + partes[1] : "");
  }
  function pct(n) {
    return fmt(n, 1) + "%";
  }
  function sinal(n) {
    return n > 0 ? "+" : "";
  }
  function pp(n) {
    return sinal(n) + fmt(n, 1) + " p.p.";
  }
  function listaPt(itens) {
    if (itens.length <= 1) return itens.join("");
    return itens.slice(0, -1).join(", ") + " e " + itens[itens.length - 1];
  }
  function dataBr(iso) {
    var p = iso.split("-");
    return p[2] + "/" + p[1] + "/" + p[0];
  }
  function anosOrdenados(obj) {
    return Object.keys(obj).sort(function (a, b) {
      return +a - +b;
    });
  }
  function uniaoAnos(listas) {
    var vistos = {};
    listas.forEach(function (l) {
      l.forEach(function (a) {
        vistos[a] = true;
      });
    });
    return Object.keys(vistos)
      .map(Number)
      .sort(function (a, b) {
        return a - b;
      });
  }

  function svgEl(tag, attrs, pai) {
    var e = document.createElementNS(NS, tag);
    if (attrs)
      Object.keys(attrs).forEach(function (k) {
        e.setAttribute(k, attrs[k]);
      });
    if (pai) pai.appendChild(e);
    return e;
  }
  function htmlEl(tag, classe, texto, pai) {
    var e = document.createElement(tag);
    if (classe) e.className = classe;
    if (texto !== undefined && texto !== null) e.textContent = texto;
    if (pai) pai.appendChild(e);
    return e;
  }
  function limpar(no) {
    while (no.firstChild) no.removeChild(no.firstChild);
  }

  function fonteCurta(id) {
    return DER.fontes_curtas[id] || id;
  }
  function fonteLink(id) {
    var f = D.fontes[id];
    var a = document.createElement("a");
    a.href = f.url;
    a.rel = "noopener";
    a.textContent = fonteCurta(id);
    return a;
  }
  function fonteDoAno(serie, ano) {
    return (serie.fonte_por_ano && serie.fonte_por_ano[ano]) || serie.fonte;
  }
  function ehAnterior(serie, ano) {
    return fonteDoAno(serie, ano) !== serie.fonte;
  }
  function escreverFonte(host, id, prefixo) {
    host.appendChild(document.createTextNode((prefixo || "Fonte: ")));
    host.appendChild(fonteLink(id));
  }

  function aoRedimensionar(host, fn) {
    var ultimo = -1;
    function rodar() {
      var w = Math.round(host.getBoundingClientRect().width);
      if (w > 0 && w !== ultimo) {
        ultimo = w;
        fn(w);
      }
    }
    if ("ResizeObserver" in window) new ResizeObserver(rodar).observe(host);
    else window.addEventListener("resize", rodar);
    rodar();
  }

  function aplicarTema(tema) {
    document.documentElement.setAttribute("data-theme", tema);
    $("rotulo-tema").textContent = tema === "light" ? "Tema escuro" : "Tema claro";
    try {
      localStorage.setItem("fdd-tema", tema);
    } catch (e) {}
  }
  function iniciarTema() {
    var atual = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
    $("rotulo-tema").textContent = atual === "light" ? "Tema escuro" : "Tema claro";
    $("botao-tema").addEventListener("click", function () {
      var tema = document.documentElement.getAttribute("data-theme") === "light" ? "dark" : "light";
      aplicarTema(tema);
    });
  }

  function iconeMarcador(forma, vazado, tamanho) {
    var t = tamanho || 14;
    var c = t / 2;
    var r = t * 0.3;
    var cls = vazado ? "g-ponto-vazado" : "g-ponto";
    var forma_svg;
    if (forma === "quadrado") forma_svg = '<rect class="' + cls + '" x="' + (c - r) + '" y="' + (c - r) + '" width="' + 2 * r + '" height="' + 2 * r + '"/>';
    else if (forma === "triangulo")
      forma_svg = '<polygon class="' + cls + '" points="' + c + "," + (c - r * 1.2) + " " + (c + r * 1.2) + "," + (c + r) + " " + (c - r * 1.2) + "," + (c + r) + '"/>';
    else if (forma === "losango")
      forma_svg = '<polygon class="' + cls + '" points="' + c + "," + (c - r * 1.25) + " " + (c + r * 1.25) + "," + c + " " + c + "," + (c + r * 1.25) + " " + (c - r * 1.25) + "," + c + '"/>';
    else forma_svg = '<circle class="' + cls + '" cx="' + c + '" cy="' + c + '" r="' + r + '"/>';
    return '<svg viewBox="0 0 ' + t + " " + t + '" width="' + t + '" height="' + t + '" aria-hidden="true">' + forma_svg + "</svg>";
  }
  function desenharMarcador(pai, forma, x, y, r, classe) {
    var g;
    if (forma === "quadrado") g = svgEl("rect", { x: x - r, y: y - r, width: 2 * r, height: 2 * r, rx: 1.5 }, pai);
    else if (forma === "triangulo")
      g = svgEl("polygon", { points: x + "," + (y - r * 1.25) + " " + (x + r * 1.2) + "," + (y + r * 0.9) + " " + (x - r * 1.2) + "," + (y + r * 0.9) }, pai);
    else if (forma === "losango")
      g = svgEl("polygon", { points: x + "," + (y - r * 1.3) + " " + (x + r * 1.3) + "," + y + " " + x + "," + (y + r * 1.3) + " " + (x - r * 1.3) + "," + y }, pai);
    else g = svgEl("circle", { cx: x, cy: y, r: r }, pai);
    g.setAttribute("class", classe);
    return g;
  }

  function montarTabela(host, cfg) {
    limpar(host);
    var t = htmlEl("table", null, null, host);
    htmlEl("caption", null, cfg.legenda, t);
    var cab = htmlEl("tr", null, null, htmlEl("thead", null, null, t));
    cfg.colunas.forEach(function (c, i) {
      var th = htmlEl("th", null, c, cab);
      th.scope = "col";
      if (i === 0) th.textContent = cfg.primeira || "";
    });
    var corpo = htmlEl("tbody", null, null, t);
    cfg.linhas.forEach(function (linha) {
      var tr = htmlEl("tr", null, null, corpo);
      var th = htmlEl("th", null, linha[0], tr);
      th.scope = "row";
      linha.slice(1).forEach(function (c) {
        htmlEl("td", null, c, tr);
      });
    });
    if (cfg.rodape) {
      var p = htmlEl("p", "nota-grafico", cfg.rodape, host);
      p.style.padding = "0 12px 10px";
    }
  }

  function montarSegmentos(host, opcoes, inicial, aoMudar) {
    limpar(host);
    var botoes = [];
    opcoes.forEach(function (o) {
      var b = htmlEl("button", "seg", o.rotulo, host);
      b.type = "button";
      b.setAttribute("aria-pressed", o.id === inicial ? "true" : "false");
      b.addEventListener("click", function () {
        botoes.forEach(function (x) {
          x.setAttribute("aria-pressed", x === b ? "true" : "false");
        });
        aoMudar(o.id);
      });
      botoes.push(b);
    });
  }

  function animarNumero(el, final, casas) {
    if (reduzMovimento) {
      el.textContent = fmt(final, casas);
      return;
    }
    var inicio = null;
    var duracao = 900;
    function passo(agora) {
      if (inicio === null) inicio = agora;
      var p = Math.min(1, (agora - inicio) / duracao);
      var suave = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(final * suave, casas);
      if (p < 1) requestAnimationFrame(passo);
      else el.textContent = fmt(final, casas);
    }
    el.textContent = fmt(0, casas);
    requestAnimationFrame(passo);
  }

  function desenharSparkline(host, serie, w) {
    limpar(host);
    var anos = anosOrdenados(serie.valores).map(Number);
    var h = 64;
    var pad = 7;
    var xMin = anos[0];
    var xMax = anos[anos.length - 1];
    var vals = anos.map(function (a) {
      return serie.valores[a];
    });
    var vMin = Math.min.apply(null, vals);
    var vMax = Math.max.apply(null, vals);
    var folga = (vMax - vMin) * 0.12 || 1;
    vMin -= folga;
    vMax += folga;
    function X(a) {
      return pad + ((a - xMin) / (xMax - xMin || 1)) * (w - 2 * pad - 6);
    }
    function Y(v) {
      return pad + (1 - (v - vMin) / (vMax - vMin)) * (h - 2 * pad);
    }
    var texto = vals
      .map(function (v, i) {
        return anos[i] + ": " + fmt(v, 1) + (serie.unidade === "%" ? "%" : " " + serie.unidade);
      })
      .join("; ");
    var s = svgEl("svg", { viewBox: "0 0 " + w + " " + h, width: w, height: h, role: "img", "aria-label": "Minigráfico de " + serie.rotulo + ". " + texto }, host);
    var solido = "";
    var tracejado = "";
    for (var i = 0; i < anos.length - 1; i++) {
      var seg = "M" + X(anos[i]) + " " + Y(vals[i]) + "L" + X(anos[i + 1]) + " " + Y(vals[i + 1]);
      if (anos[i + 1] - anos[i] > 1) tracejado += seg;
      else solido += seg;
    }
    var base = svgEl("g", { class: "cor-lilas" }, s);
    if (tracejado) svgEl("path", { d: tracejado, class: "g-linha g-linha-fina", "stroke-dasharray": "4 4", opacity: 0.8 }, base);
    if (solido) svgEl("path", { d: solido, class: "g-linha g-linha-fina" }, base);
    anos.forEach(function (a, i) {
      var ultimo = i === anos.length - 1;
      var vazado = ehAnterior(serie, String(a));
      desenharMarcador(base, "circulo", X(a), Y(vals[i]), ultimo ? 4.6 : 3.4, vazado ? "g-ponto-vazado" : "g-ponto");
    });
  }

  function iniciarHero() {
    var milhoes = D.series.sem_internet_milhoes.valores[ANO_ATUAL];
    var perc = D.series.sem_internet_pct.valores[ANO_ATUAL];
    var motivos = D.motivos_pessoas_2025.valores;
    var nomes = Object.keys(motivos).filter(function (k) {
      return k !== "Outro";
    });
    nomes.sort(function (a, b) {
      return motivos[b] - motivos[a];
    });
    var principal = nomes[0];
    $("hero-resposta").innerHTML =
      "<strong>Resposta curta (fato):</strong> " +
      fmt(milhoes, 1) +
      " milhões de pessoas, ou " +
      pct(perc) +
      " das pessoas de 10 anos ou mais, não usaram a internet em " +
      ANO_ATUAL +
      ". Entre elas, " +
      pct(motivos[principal]) +
      " apontaram “" +
      principal +
      "” como principal motivo.";
  }

  function iniciarPontos() {
    var host = $("hero-pontos");
    var perc = D.series.sem_internet_pct.valores[ANO_ATUAL];
    var passo = 26;
    var w = passo * 10;
    var s = svgEl("svg", { viewBox: "0 0 " + w + " " + w, width: "100%", role: "img", "aria-label": "Cada ponto representa 1 em cada 100 pessoas de 10 anos ou mais. " + fmt(perc, 1) + " pontos estão destacados: são as pessoas que não usaram a internet em " + ANO_ATUAL + "." }, host);
    var defs = svgEl("defs", null, s);
    for (var i = 0; i < 100; i++) {
      var col = i % 10;
      var lin = Math.floor(i / 10);
      var cx = col * passo + passo / 2;
      var cy = lin * passo + passo / 2;
      var restante = perc - (99 - i);
      var cls = "ponto-uso";
      if (restante >= 1) cls = "ponto-fora";
      var c = svgEl("circle", { cx: cx, cy: cy, r: 8.5, class: cls }, s);
      c.style.animationDelay = i * 8 + "ms";
      if (restante > 0 && restante < 1) {
        var id = "recorte-ponto";
        var cp = svgEl("clipPath", { id: id }, defs);
        svgEl("rect", { x: cx + 8.5 - restante * 17, y: cy - 9, width: restante * 17 + 1, height: 18 }, cp);
        svgEl("circle", { cx: cx, cy: cy, r: 8.5, class: "ponto-fora", "clip-path": "url(#" + id + ")" }, s);
      }
    }
  }

  function iniciarKpis() {
    var S = D.series;
    var definicoes = [
      { id: "internet_pessoas", rotulo: "Pessoas que usaram a internet em 2025", sub: function (s) { return "Em " + anosOrdenados(s.valores)[0] + ": " + pct(s.valores[anosOrdenados(s.valores)[0]]); } },
      { id: "sem_internet_milhoes", rotulo: "Pessoas sem internet em 2025", destaque: true, bomQuandoCai: true, casas: 1, unidade: "milhões", extra: "sem_internet_pct" },
      { id: "internet_domicilios", rotulo: "Domicílios com internet", sub: function () { return "Pesquisa traz 2024 e 2025 para domicílios"; } },
      { id: "celular_pessoas", rotulo: "Pessoas com celular para uso pessoal", sub: function (s) { return "Em " + anosOrdenados(s.valores)[0] + ": " + pct(s.valores[anosOrdenados(s.valores)[0]]); } },
      { id: "internet_60mais", rotulo: "Pessoas de 60 anos ou mais online", sub: function (s) { return "Em " + anosOrdenados(s.valores)[0] + ": " + pct(s.valores[anosOrdenados(s.valores)[0]]); } },
      { id: "internet_rural", rotulo: "Área rural online", sub: function (s) { return "Em " + anosOrdenados(s.valores)[0] + ": " + pct(s.valores[anosOrdenados(s.valores)[0]]); } },
    ];
    var raiz = $("kpis");
    definicoes.forEach(function (def) {
      var serie = S[def.id];
      var v = DER.variacao[def.id];
      var cartao = htmlEl("article", "kpi" + (def.destaque ? " kpi-destaque" : ""), null, raiz);
      htmlEl("h3", "kpi-rotulo", def.rotulo, cartao);
      var valor = htmlEl("div", "kpi-valor", null, cartao);
      var numero = htmlEl("span", null, null, valor);
      var unidade = def.unidade || "%";
      htmlEl("small", null, unidade, valor);
      animarNumero(numero, serie.valores[ANO_ATUAL], 1);

      var melhora = def.bomQuandoCai ? v.delta < 0 : v.delta > 0;
      var delta = htmlEl("span", "delta" + (melhora ? "" : " delta-atencao"), null, cartao);
      var seta = v.delta >= 0 ? "M12 19V5m0 0-6 6m6-6 6 6" : "M12 5v14m0 0-6-6m6 6 6-6";
      delta.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path d="' + seta + '" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      var rotuloDelta = sinal(v.delta) + fmt(v.delta, 1) + (v.unidade === "%" ? " p.p." : " " + v.unidade) + " vs " + v.ano_anterior;
      var visivel = htmlEl("span", null, rotuloDelta, delta);
      visivel.setAttribute("aria-hidden", "true");
      var verbo = v.delta >= 0 ? "aumento" : "queda";
      var unidadeExtenso = v.unidade === "%" ? "pontos percentuais" : v.unidade;
      htmlEl("span", "sr", "Variação contra " + v.ano_anterior + ": " + verbo + " de " + fmt(Math.abs(v.delta), 1) + " " + unidadeExtenso + (melhora ? ", favorável" : ""), delta);

      var sub = htmlEl("p", "kpi-sub", null, cartao);
      if (def.extra) {
        var ex = S[def.extra];
        var anos = anosOrdenados(ex.valores);
        var vx = DER.variacao[def.extra];
        sub.textContent =
          pct(ex.valores[ANO_ATUAL]) + " das pessoas de 10 anos ou mais (" + pp(vx.delta) + " vs " + vx.ano_anterior + "; em " + anos[0] + " eram " + pct(ex.valores[anos[0]]) + ").";
      } else sub.textContent = def.sub(serie);

      var spark = htmlEl("div", "spark", null, cartao);
      var hostSpark = htmlEl("div", null, null, spark);
      var anosSerie = anosOrdenados(serie.valores);
      var eixo = htmlEl("div", "spark-eixo", null, spark);
      htmlEl("span", null, anosSerie[0], eixo);
      htmlEl("span", null, anosSerie[anosSerie.length - 1], eixo);
      aoRedimensionar(hostSpark, function (w) {
        desenharSparkline(hostSpark, serie, w);
      });
    });

    var anosTodos = uniaoAnos(definicoes.map(function (d) { return Object.keys(S[d.id].valores); }));
    var linhas = definicoes.map(function (def) {
      var serie = S[def.id];
      var l = [serie.rotulo + (serie.unidade === "milhões" ? " (milhões)" : " (%)")];
      anosTodos.forEach(function (a) {
        var v = serie.valores[a];
        l.push(v === undefined ? "sem dado" : fmt(v, 1) + (ehAnterior(serie, String(a)) ? "*" : ""));
      });
      return l;
    });
    montarTabela($("tabela-kpis-corpo"), {
      legenda: "Séries dos seis indicadores, por ano.",
      colunas: ["Indicador"].concat(anosTodos.map(String)),
      primeira: "Indicador",
      linhas: linhas,
      rodape: "* Valor de divulgação anterior (" + fonteCurta("tic2024") + "), que pode diferir da série revisada. Fonte dos demais: " + fonteCurta("tic2025") + ".",
    });
  }

  function montarLinhas(host, cfg) {
    var anosDados = uniaoAnos(cfg.series.map(function (s) { return Object.keys(s.valores); }));
    var xMin = anosDados[0];
    var xMax = anosDados[anosDados.length - 1];
    var idx = null;
    var larguraAtual = 0;
    var tip = htmlEl("div", "dica", null, host);
    tip.hidden = true;
    var live = htmlEl("div", "sr", null, host.parentNode);
    live.setAttribute("aria-live", "polite");
    live.setAttribute("aria-atomic", "true");
    var dica = htmlEl("span", "sr", "Use as setas para a esquerda e para a direita para ler cada ano. Escape fecha a leitura.", host.parentNode);
    dica.id = host.id + "-dica";
    host.tabIndex = 0;
    host.setAttribute("role", "group");
    host.setAttribute("aria-label", cfg.aria);
    host.setAttribute("aria-describedby", dica.id);
    var geometria = null;
    var camadaDestaque = null;

    function conteudoDica(ano) {
      var a = String(ano);
      var fontes = [];
      var algumAnterior = false;
      var linhas = cfg.series
        .filter(function (s) {
          return s.valores[a] !== undefined;
        })
        .map(function (s) {
          var ant = s.dados ? ehAnterior(s.dados, a) : false;
          if (ant) algumAnterior = true;
          var f = s.dados ? fonteDoAno(s.dados, a) : cfg.fonte;
          if (fontes.indexOf(f) < 0) fontes.push(f);
          return { s: s, v: s.valores[a], ant: ant };
        });
      var html = '<div class="dica-ano">' + a + "</div>";
      var texto = a + ": ";
      var partes = [];
      linhas.forEach(function (l) {
        html +=
          '<div class="dica-linha"><span class="' + l.s.cor + '">' + iconeMarcador(l.s.forma, l.ant) + l.s.rotulo + "</span><b>" + fmt(l.v, 1) + "%" + (l.ant ? " (anterior)" : "") + "</b></div>";
        partes.push(l.s.rotulo + " " + fmt(l.v, 1) + "%" + (l.ant ? ", divulgação anterior" : ""));
      });
      texto += partes.join("; ") + ".";
      if (cfg.gap && DER.gap_urbano_rural[a] !== undefined) {
        html += '<div class="dica-gap">Gap urbano e rural: ' + fmt(DER.gap_urbano_rural[a], 1) + " p.p.</div>";
        texto += " Gap urbano e rural de " + fmt(DER.gap_urbano_rural[a], 1) + " pontos percentuais.";
      }
      var nomesFonte = fontes.map(fonteCurta).join("; ");
      html += '<div class="dica-fonte">Fonte: ' + nomesFonte + "</div>";
      texto += " Fonte: " + nomesFonte + ".";
      if (algumAnterior) {
        html += '<div class="dica-aviso">Divulgação anterior: pode diferir da série revisada.</div>';
        texto += " Parte desses valores é de divulgação anterior e pode diferir da série revisada.";
      }
      return { html: html, texto: texto };
    }

    function marcarDestaque() {
      if (!camadaDestaque || !geometria) return;
      limpar(camadaDestaque);
      if (idx === null) return;
      var ano = anosDados[idx];
      var x = geometria.X(ano);
      svgEl("line", { x1: x, x2: x, y1: geometria.topo, y2: geometria.base, class: "g-guia" }, camadaDestaque);
      cfg.series.forEach(function (s) {
        var v = s.valores[ano];
        if (v === undefined) return;
        var g = svgEl("g", { class: s.cor }, camadaDestaque);
        desenharMarcador(g, s.forma, x, geometria.Y(v), 6.5, "g-ponto g-ponto-forte");
      });
    }

    function mostrar(i, anunciar) {
      idx = Math.max(0, Math.min(anosDados.length - 1, i));
      var c = conteudoDica(anosDados[idx]);
      tip.innerHTML = c.html;
      tip.hidden = false;
      marcarDestaque();
      if (geometria) {
        var x = geometria.X(anosDados[idx]);
        var largura = tip.offsetWidth;
        var esq = x + 14;
        if (esq + largura > larguraAtual) esq = x - largura - 14;
        if (esq < 0) esq = 0;
        tip.style.left = esq + "px";
        tip.style.top = geometria.topo + 6 + "px";
      }
      if (anunciar) live.textContent = c.texto;
    }
    function esconder() {
      idx = null;
      tip.hidden = true;
      marcarDestaque();
    }

    function desenhar(w) {
      larguraAtual = w;
      var estreito = w < 460;
      var m = { t: 16, r: estreito ? 46 : 58, b: 34, l: estreito ? 38 : 46 };
      var h = w < 460 ? 320 : w < 820 ? 360 : 410;
      var pw = w - m.l - m.r;
      var ph = h - m.t - m.b;
      function X(a) {
        return m.l + ((a - xMin) / (xMax - xMin)) * pw;
      }
      function Y(v) {
        return m.t + (1 - (v - cfg.yMin) / (cfg.yMax - cfg.yMin)) * ph;
      }
      geometria = { X: X, Y: Y, topo: m.t, base: m.t + ph };

      var antigo = host.querySelector("svg");
      if (antigo) host.removeChild(antigo);
      var s = svgEl("svg", { viewBox: "0 0 " + w + " " + h, width: w, height: h, "aria-hidden": "true", focusable: "false" });
      host.insertBefore(s, tip);

      cfg.yTicks.forEach(function (t) {
        svgEl("line", { x1: m.l, x2: m.l + pw, y1: Y(t), y2: Y(t), class: "g-grade" }, s);
        var tx = svgEl("text", { x: m.l - 8, y: Y(t) + 4, "text-anchor": "end", class: "g-texto" }, s);
        tx.textContent = t + "%";
      });
      svgEl("line", { x1: m.l, x2: m.l + pw, y1: m.t + ph, y2: m.t + ph, class: "g-eixo" }, s);
      for (var a = xMin; a <= xMax; a++) svgEl("line", { x1: X(a), x2: X(a), y1: m.t + ph, y2: m.t + ph + 4, class: "g-eixo" }, s);

      var mostrados = [];
      anosDados.forEach(function (a2, i) {
        if (i === anosDados.length - 1) return;
        var longeDoFim = X(xMax) - X(a2) >= 36;
        var longeDoAnterior = mostrados.length === 0 || X(a2) - X(mostrados[mostrados.length - 1]) >= 36;
        if (longeDoFim && longeDoAnterior) mostrados.push(a2);
      });
      mostrados.push(xMax);
      mostrados.forEach(function (a2) {
        var t = svgEl("text", { x: X(a2), y: m.t + ph + 21, "text-anchor": "middle", class: "g-texto" }, s);
        t.textContent = a2;
      });

      if (cfg.anotarAnterior) {
        anosDados.forEach(function (a2) {
          var comValor = cfg.series.filter(function (sr) { return sr.valores[a2] !== undefined; });
          var todos = comValor.length > 0 && comValor.every(function (sr) { return sr.dados && ehAnterior(sr.dados, String(a2)); });
          if (!todos) return;
          svgEl("line", { x1: X(a2), x2: X(a2), y1: m.t, y2: m.t + ph, class: "g-anterior" }, s);
          var rotulo = a2 + ": divulgação anterior";
          var larg = rotulo.length * 6;
          var fim = X(a2) + larg / 2 > w - 4;
          var t = svgEl("text", { x: fim ? X(a2) - 5 : X(a2), y: m.t + ph - 8, "text-anchor": fim ? "end" : "middle", class: "g-texto" }, s);
          t.textContent = rotulo;
        });
      }

      if (cfg.gap) {
        var alto = cfg.series.filter(function (sr) { return sr.id === cfg.gap.alto; })[0];
        var baixo = cfg.series.filter(function (sr) { return sr.id === cfg.gap.baixo; })[0];
        var comuns = anosDados.filter(function (a2) { return alto.valores[a2] !== undefined && baixo.valores[a2] !== undefined; });
        var pontos = comuns.map(function (a2) { return X(a2) + "," + Y(alto.valores[a2]); }).concat(
          comuns.slice().reverse().map(function (a2) { return X(a2) + "," + Y(baixo.valores[a2]); })
        );
        svgEl("polygon", { points: pontos.join(" "), class: "g-gap" }, s);
      }

      cfg.series.forEach(function (sr) {
        var anos = anosDados.filter(function (a2) { return sr.valores[a2] !== undefined; });
        var solido = "";
        var tracejado = "";
        for (var i = 0; i < anos.length - 1; i++) {
          var seg = "M" + X(anos[i]) + " " + Y(sr.valores[anos[i]]) + "L" + X(anos[i + 1]) + " " + Y(sr.valores[anos[i + 1]]);
          if (anos[i + 1] - anos[i] > 1) tracejado += seg;
          else solido += seg;
        }
        var g = svgEl("g", { class: sr.cor }, s);
        if (tracejado) svgEl("path", { d: tracejado, class: "g-linha", "stroke-dasharray": "7 6", opacity: 0.85 }, g);
        if (solido) svgEl("path", { d: solido, class: "g-linha" }, g);
        anos.forEach(function (a2) {
          var vazado = sr.dados ? ehAnterior(sr.dados, String(a2)) : false;
          desenharMarcador(g, sr.forma, X(a2), Y(sr.valores[a2]), 4.6, vazado ? "g-ponto-vazado" : "g-ponto");
        });
      });

      var fins = cfg.series
        .map(function (sr) {
          return { y: Y(sr.valores[xMax]), texto: fmt(sr.valores[xMax], 1) + "%", cor: sr.cor };
        })
        .sort(function (a1, b1) {
          return a1.y - b1.y;
        });
      for (var k = 1; k < fins.length; k++) if (fins[k].y - fins[k - 1].y < 14) fins[k].y = fins[k - 1].y + 14;
      fins.forEach(function (f) {
        var g = svgEl("g", { class: f.cor }, s);
        var t = svgEl("text", { x: X(xMax) + 9, y: f.y + 4, class: "g-fim" }, g);
        t.textContent = f.texto;
      });

      if (cfg.gap) {
        var altoS = cfg.series.filter(function (sr) { return sr.id === cfg.gap.alto; })[0];
        var baixoS = cfg.series.filter(function (sr) { return sr.id === cfg.gap.baixo; })[0];
        function colchete(ano, yPilula, ancora) {
          var x = X(ano);
          svgEl("line", { x1: x, x2: x, y1: Y(altoS.valores[ano]), y2: Y(baixoS.valores[ano]), class: "g-colchete" }, s);
          var rotulo = "Gap " + ano + ": " + fmt(DER.gap_urbano_rural[ano], 1) + " p.p.";
          var larg = rotulo.length * 6.7 + 18;
          var rx = ancora === "inicio" ? x - 8 : x + 6 - larg;
          var ry = yPilula - 12;
          svgEl("rect", { x: rx, y: ry, width: larg, height: 24, rx: 12, class: "g-pilula" }, s);
          var t = svgEl("text", { x: rx + larg / 2, y: yPilula + 4.5, "text-anchor": "middle", class: "g-pilula-texto" }, s);
          t.textContent = rotulo;
          var yLigacao = ancora === "inicio" ? ry + 24 : ry;
          var yPonta = ancora === "inicio" ? Y(altoS.valores[ano]) : Y(baixoS.valores[ano]);
          svgEl("line", { x1: x, x2: x, y1: yLigacao, y2: yPonta, class: "g-colchete" }, s);
        }
        var primeiro = String(xMin);
        var ultimo = String(xMax);
        colchete(primeiro, Y(94.5), "inicio");
        colchete(ultimo, Y(cfg.gap.yPilulaFim), "fim");
      }

      camadaDestaque = svgEl("g", null, s);
      var alvo = svgEl("rect", { x: m.l - 10, y: m.t - 6, width: pw + 20, height: ph + 12, fill: "transparent" }, s);
      function proximo(ev) {
        var r = s.getBoundingClientRect();
        var px = ev.clientX - r.left;
        var melhor = 0;
        var dist = Infinity;
        anosDados.forEach(function (a2, i) {
          var d = Math.abs(X(a2) - px);
          if (d < dist) {
            dist = d;
            melhor = i;
          }
        });
        return melhor;
      }
      alvo.addEventListener("pointermove", function (ev) {
        mostrar(proximo(ev), false);
      });
      alvo.addEventListener("pointerdown", function (ev) {
        mostrar(proximo(ev), true);
      });
      alvo.addEventListener("pointerleave", function () {
        if (document.activeElement !== host) esconder();
      });
      if (idx !== null) mostrar(idx, false);
    }

    host.addEventListener("focus", function () {
      mostrar(idx === null ? anosDados.length - 1 : idx, true);
    });
    host.addEventListener("blur", esconder);
    host.addEventListener("keydown", function (ev) {
      var atual = idx === null ? anosDados.length - 1 : idx;
      var novo = null;
      if (ev.key === "ArrowLeft") novo = atual - 1;
      else if (ev.key === "ArrowRight") novo = atual + 1;
      else if (ev.key === "Home") novo = 0;
      else if (ev.key === "End") novo = anosDados.length - 1;
      else if (ev.key === "Escape") {
        esconder();
        live.textContent = "";
        return;
      }
      if (novo !== null) {
        ev.preventDefault();
        mostrar(novo, true);
      }
    });

    aoRedimensionar(host, desenhar);
  }

  function legendaItem(pai, icone, texto) {
    var item = htmlEl("span", "legenda-item", null, pai);
    item.innerHTML = icone;
    item.appendChild(document.createTextNode(texto));
    return item;
  }

  function anosAnteriores(ids) {
    var porSerie = [];
    ids.forEach(function (id) {
      var s = D.series[id];
      var anos = Object.keys(s.fonte_por_ano || {}).filter(function (a) { return ehAnterior(s, a); });
      if (anos.length) porSerie.push({ rotulo: id === "internet_pessoas" ? "Brasil" : s.rotulo, anos: anos.sort() });
    });
    return porSerie;
  }

  function iniciarLinhas() {
    var S = D.series;
    var gap = DER.gap_urbano_rural;
    var anosGap = anosOrdenados(gap);
    var p = anosGap[0];
    var u = anosGap[anosGap.length - 1];
    $("lead-linhas").textContent =
      "Em " + p + ", " + pct(S.internet_urbano.valores[p]) + " das pessoas na área urbana e " + pct(S.internet_rural.valores[p]) + " na rural usavam internet, um gap de " + fmt(gap[p], 1) +
      " p.p. Em " + u + ", são " + pct(S.internet_urbano.valores[u]) + " e " + pct(S.internet_rural.valores[u]) + ", um gap de " + fmt(gap[u], 1) + " p.p.";

    var series = [
      { id: "internet_urbano", rotulo: "Urbano", cor: "cor-lilas", forma: "circulo", dados: S.internet_urbano, valores: S.internet_urbano.valores },
      { id: "internet_rural", rotulo: "Rural", cor: "cor-ciano", forma: "quadrado", dados: S.internet_rural, valores: S.internet_rural.valores },
      { id: "internet_pessoas", rotulo: "Brasil", cor: "cor-neutro", forma: "triangulo", dados: S.internet_pessoas, valores: S.internet_pessoas.valores },
    ];
    var leg = $("legenda-linhas");
    series.forEach(function (sr) {
      var item = htmlEl("span", "legenda-item " + sr.cor, null, leg);
      item.innerHTML = iconeMarcador(sr.forma, false);
      item.appendChild(document.createTextNode(sr.rotulo));
    });
    legendaItem(leg, '<svg viewBox="0 0 14 14" width="14" height="14" aria-hidden="true"><rect x="1" y="3" width="12" height="8" rx="2" class="g-gap" style="opacity:.5"/></svg>', "Gap entre urbano e rural");
    legendaItem(leg, iconeMarcador("circulo", true), "Marcador vazado: divulgação anterior").classList.add("cor-neutro");
    legendaItem(leg, '<svg viewBox="0 0 22 14" width="22" height="14" aria-hidden="true"><path d="M1 7h20" class="g-linha" style="stroke:var(--texto-2);stroke-width:2" stroke-dasharray="4 3"/></svg>', "Tracejado: anos sem dado");

    var anosPresentes = anosOrdenados(S.internet_pessoas.valores).map(Number);
    var faltantes = [];
    for (var a = anosPresentes[0]; a <= anosPresentes[anosPresentes.length - 1]; a++) if (anosPresentes.indexOf(a) < 0) faltantes.push(a);
    var ant = anosAnteriores(["internet_pessoas", "internet_urbano", "internet_rural"]);
    var nota = $("nota-linhas");
    var t1 = htmlEl("span", null, null, nota);
    t1.textContent =
      "Os anos sem dado nesta série (" + listaPt(faltantes) + ") não são interpolados: os trechos tracejados só ligam pontos vizinhos. ";
    var t2 = htmlEl("span", null, null, nota);
    t2.textContent =
      "Divulgação anterior: " + ant.map(function (x) { return x.rotulo + " em " + listaPt(x.anos); }).join("; ") + ". Esses pontos vêm de ";
    nota.appendChild(fonteLink("tic2024"));
    nota.appendChild(document.createTextNode(" e podem diferir da série revisada. Demais pontos: "));
    nota.appendChild(fonteLink("tic2025"));
    nota.appendChild(document.createTextNode(". O eixo vertical começa em 20% para mostrar a série rural."));

    montarLinhas($("grafico-linhas"), {
      series: series,
      yMin: 20,
      yMax: 100,
      yTicks: [20, 40, 60, 80, 100],
      gap: { alto: "internet_urbano", baixo: "internet_rural", yPilulaFim: 55 },
      anotarAnterior: true,
      fonte: "tic2025",
      aria:
        "Gráfico de linhas: percentual de pessoas que usaram a internet no Brasil, na área urbana e na área rural, de " + anosPresentes[0] + " a " + anosPresentes[anosPresentes.length - 1] +
        ". O gap entre urbano e rural foi de " + fmt(gap[p], 1) + " pontos percentuais em " + p + " e de " + fmt(gap[u], 1) + " em " + u + ". Use as setas para ler cada ano.",
    });

    var anosTab = anosPresentes;
    var linhas = series.map(function (sr) {
      var l = [sr.rotulo + " (%)"];
      anosTab.forEach(function (an) {
        var v = sr.valores[an];
        l.push(v === undefined ? "sem dado" : fmt(v, 1) + (ehAnterior(sr.dados, String(an)) ? "*" : ""));
      });
      return l;
    });
    var linhaGap = ["Gap urbano e rural (p.p.)"];
    anosTab.forEach(function (an) {
      linhaGap.push(gap[an] === undefined ? "sem dado" : fmt(gap[an], 1));
    });
    linhas.push(linhaGap);
    montarTabela($("tabela-linhas"), {
      legenda: "Percentual de pessoas que usaram a internet, por área, e gap entre urbano e rural.",
      colunas: ["Série"].concat(anosTab.map(String)),
      primeira: "Série",
      linhas: linhas,
      rodape: "* Divulgação anterior (" + fonteCurta("tic2024") + "). Demais valores: " + fonteCurta("tic2025") + ".",
    });
  }

  function montarBarras(host, obterCfg) {
    var larguraAtual = 0;
    function desenhar(w, animar) {
      var cfg = obterCfg();
      larguraAtual = w;
      limpar(host);
      var linha = 46;
      var topo = cfg.ref ? 28 : 6;
      var trilho = w - 54;
      var h = topo + cfg.itens.length * linha + 4;
      var s = svgEl("svg", { viewBox: "0 0 " + w + " " + h, width: w, height: h, role: "img", "aria-label": cfg.aria }, host);
      function X(v) {
        return (v / cfg.max) * trilho;
      }
      cfg.itens.forEach(function (item, i) {
        var y0 = topo + i * linha;
        svgEl("rect", { x: 0, y: y0 + 22, width: trilho, height: 14, rx: 7, class: "b-trilho" }, s);
        var destaque = cfg.destaque === i;
        var cls = "b-barra" + (destaque ? " b-barra-dest" : "") + (item.abaixo ? " b-barra-fora" : "");
        var barra = svgEl("rect", { x: 0, y: y0 + 22, width: Math.max(4, X(item.valor)), height: 14, rx: 7, class: cls }, s);
        if (!animar) barra.style.animation = "none";
      });
      if (cfg.ref) {
        var xr = X(cfg.ref.valor);
        svgEl("line", { x1: xr, x2: xr, y1: 18, y2: h - 2, class: "b-ref" }, s);
        var fim = xr + 60 > w;
        var tr = svgEl("text", { x: fim ? xr + 4 : xr, y: 11, "text-anchor": fim ? "end" : "middle", class: "b-ref-texto" }, s);
        tr.textContent = cfg.ref.rotulo;
      }
      cfg.itens.forEach(function (item, i) {
        var y0 = topo + i * linha;
        var destaque = cfg.destaque === i;
        var tl = svgEl("text", { x: 0, y: y0 + 14, class: "b-rotulo" + (destaque ? " b-rotulo-dest" : "") }, s);
        tl.textContent = item.rotulo;
        if (item.extra) {
          var te = svgEl("text", { x: w, y: y0 + 14, "text-anchor": "end", class: "b-extra" }, s);
          te.textContent = item.extra;
        }
        var tv = svgEl("text", { x: Math.max(4, X(item.valor)) + 8, y: y0 + 34, class: "b-valor" }, s);
        tv.textContent = cfg.fmt(item.valor);
      });
    }
    aoRedimensionar(host, function (w) {
      desenhar(w, false);
    });
    return {
      redesenhar: function () {
        desenhar(larguraAtual || Math.round(host.getBoundingClientRect().width), true);
      },
    };
  }

  function iniciarMotivos() {
    var blocos = {
      pessoas: { chave: "motivos_pessoas_2025", rotulo: "Pessoas" },
      domicilios: { chave: "motivos_domicilios_2025", rotulo: "Domicílios" },
      celular: { chave: "sem_celular_motivos_2025", rotulo: "Sem celular" },
    };
    var atual = "pessoas";

    function ordenados(bloco) {
      var v = bloco.valores;
      var nomes = Object.keys(v);
      var outros = nomes.filter(function (n) { return n === "Outro"; });
      var resto = nomes.filter(function (n) { return n !== "Outro"; }).sort(function (a, b) { return v[b] - v[a]; });
      return resto.concat(outros);
    }

    var P = ordenados(D.motivos_pessoas_2025);
    var Dm = ordenados(D.motivos_domicilios_2025);
    $("lead-motivos").textContent =
      "Entre as pessoas que não usaram a internet em " + ANO_ATUAL + ", o motivo mais citado foi “" + P[0] + "” (" + pct(D.motivos_pessoas_2025.valores[P[0]]) + "), seguido de “" + P[1] + "” (" +
      pct(D.motivos_pessoas_2025.valores[P[1]]) + "). Nos domicílios sem internet, o motivo mais citado foi “" + Dm[0] + "” (" + pct(D.motivos_domicilios_2025.valores[Dm[0]]) + ").";

    function cfgAtual() {
      var bloco = D[blocos[atual].chave];
      var nomes = ordenados(bloco);
      var maximo = Math.max.apply(null, nomes.map(function (n) { return bloco.valores[n]; }));
      return {
        itens: nomes.map(function (n) { return { rotulo: n, valor: bloco.valores[n] }; }),
        max: Math.ceil(maximo / 10) * 10,
        destaque: 0,
        fmt: pct,
        aria: "Gráfico de barras horizontais. " + bloco.rotulo + ". " + nomes.map(function (n) { return n + ": " + pct(bloco.valores[n]); }).join("; ") + ".",
      };
    }

    var grafico = montarBarras($("grafico-motivos"), cfgAtual);

    function atualizarTexto() {
      var bloco = D[blocos[atual].chave];
      $("rotulo-motivos").textContent = bloco.rotulo;
      var nota = $("nota-motivos");
      limpar(nota);
      var soma = DER.soma_motivos[blocos[atual].chave];
      escreverFonte(nota, bloco.fonte);
      var txt = ". Os motivos listados somam " + pct(soma) + ".";
      if (soma < 99.8) txt += " O restante não consta nos dados deste projeto.";
      txt += " Destaque em magenta: o motivo mais citado.";
      nota.appendChild(document.createTextNode(txt));
      var nomes = ordenados(bloco);
      montarTabela($("tabela-motivos"), {
        legenda: bloco.rotulo,
        colunas: ["Motivo", "Percentual"],
        primeira: "Motivo",
        linhas: nomes.map(function (n) { return [n, pct(bloco.valores[n])]; }),
        rodape: "Fonte: " + fonteCurta(bloco.fonte) + ". Soma dos motivos listados: " + pct(soma) + ".",
      });
    }

    montarSegmentos(
      $("seg-motivos"),
      Object.keys(blocos).map(function (k) { return { id: k, rotulo: blocos[k].rotulo }; }),
      atual,
      function (id) {
        atual = id;
        atualizarTexto();
        grafico.redesenhar();
      }
    );
    atualizarTexto();
  }

  function iniciarRecortes() {
    var R = D.recortes_2025;
    var cortes = [
      { id: "regiao", rotulo: "Região" },
      { id: "area", rotulo: "Área" },
      { id: "idade", rotulo: "Idade", parcial: true },
      { id: "instrucao", rotulo: "Instrução", parcial: true },
      { id: "sexo", rotulo: "Sexo" },
      { id: "cor_raca", rotulo: "Cor ou raça", parcial: true },
    ];
    var atual = "idade";
    var brasil = D.series.internet_pessoas.valores[ANO_ATUAL];

    function cfgAtual() {
      var r = R[atual];
      var nomes = Object.keys(r.valores);
      return {
        itens: nomes.map(function (n) {
          var v = r.valores[n];
          return { rotulo: n, valor: v, extra: pp(Math.round((v - brasil) * 10) / 10) + " vs Brasil", abaixo: v < brasil };
        }),
        max: 100,
        ref: { valor: brasil, rotulo: "Brasil " + pct(brasil) },
        fmt: pct,
        aria: r.rotulo + ". Média do Brasil: " + pct(brasil) + ". " + nomes.map(function (n) { return n + ": " + pct(r.valores[n]); }).join("; ") + ".",
      };
    }
    var grafico = montarBarras($("grafico-recortes"), cfgAtual);

    function atualizarTexto() {
      var r = R[atual];
      var corte = cortes.filter(function (c) { return c.id === atual; })[0];
      $("rotulo-recortes").textContent = r.rotulo;
      var nota = $("nota-recortes");
      limpar(nota);
      escreverFonte(nota, r.fonte);
      nota.appendChild(document.createTextNode(". Barras em magenta ficam abaixo da média do Brasil."));
      if (corte.parcial) nota.appendChild(document.createTextNode(" Lista parcial: o painel mostra só as categorias que constam nos dados do projeto."));
      if (r.nota) {
        var p = htmlEl("span", null, null, nota);
        p.appendChild(document.createElement("br"));
        p.appendChild(document.createTextNode("Nota do dado: " + r.nota));
      }
      var nomes = Object.keys(r.valores);
      montarTabela($("tabela-recortes"), {
        legenda: r.rotulo,
        colunas: ["Categoria", "Percentual", "Diferença para o Brasil"],
        primeira: "Categoria",
        linhas: nomes.map(function (n) { return [n, pct(r.valores[n]), pp(Math.round((r.valores[n] - brasil) * 10) / 10)]; }),
        rodape: "Fonte: " + fonteCurta(r.fonte) + ". Média do Brasil: " + pct(brasil) + ".",
      });
    }
    montarSegmentos(
      $("seg-recortes"),
      cortes.map(function (c) { return { id: c.id, rotulo: c.rotulo }; }),
      atual,
      function (id) {
        atual = id;
        atualizarTexto();
        grafico.redesenhar();
      }
    );
    atualizarTexto();
  }

  function blocoAtend(pai, tipo, rotulo) {
    var b = htmlEl("div", "bloco bloco-" + tipo, null, pai);
    htmlEl("span", "bloco-rotulo", rotulo, b);
    return b;
  }

  function iniciarAtendimento() {
    var M = D.motivos_pessoas_2025.valores;
    var Mdom = D.motivos_domicilios_2025.valores;
    var F = D.finalidades;
    var anosF = F.anos;
    var ultimoF = anosF.length - 1;
    var fora = DER.fora;
    var renda = D.recortes_2025.renda_per_capita;
    var money = function (n) {
      return "R$ " + fmt(n, 0);
    };
    var cartoes = [
      {
        titulo: "Muita gente fora da internet não sabe usar",
        fatos: [
          { numero: pct(M["Não sabiam usar"]), texto: "das pessoas que não usaram a internet em " + ANO_ATUAL + " apontaram “Não sabiam usar” como principal motivo.", extra: "Depois vêm falta de necessidade (" + pct(M["Falta de necessidade"]) + ") e serviço ou equipamento caro (" + pct(M["Serviço ou equipamento caro"]) + ").", fonte: "tic2025" },
        ],
        leitura: "Se o atendimento for só digital, essa parcela talvez não consiga nem pedir ajuda. Pode valer manter telefone e atendimento humano, com o caminho fácil de achar.",
        limite: "O percentual é sobre quem não usa internet (" + fmt(D.series.sem_internet_milhoes.valores[ANO_ATUAL], 1) + " milhões de pessoas), não sobre a base de clientes de uma empresa.",
      },
      {
        titulo: "Entre pessoas de 60 anos ou mais, a lacuna é maior",
        fatos: [
          { numero: pct(fora.internet_60mais[ANO_ATUAL]), texto: "das pessoas de 60 anos ou mais não usaram a internet em " + ANO_ATUAL + " (100% menos " + pct(D.series.internet_60mais.valores[ANO_ATUAL]) + " que usaram).", extra: "Em 2019 eram " + pct(fora.internet_60mais["2019"]) + " nessa faixa; a média do Brasil em " + ANO_ATUAL + " é " + pct(fora.internet_pessoas[ANO_ATUAL]) + ".", fonte: "tic2025" },
        ],
        leitura: "Para públicos com muitos idosos, convém testar o fluxo com ajuda de uma pessoa e linguagem simples antes de desligar canais assistidos.",
        limite: "É média nacional da faixa etária. O perfil real dos clientes de um serviço pode ser bem diferente. O valor é derivado: 100 menos o percentual que usou.",
      },
      {
        titulo: "Estar online não significa resolver tudo online",
        fatos: [
          { numero: pct(F.valores["Usar serviço público"][ultimoF]), texto: "de quem usou a internet em " + anosF[ultimoF] + " usou serviço público online, contra " + pct(F.valores["Mensagens"][ultimoF]) + " que usaram mensagens.", fonte: "tic2025" },
          { numero: pct(F.valores["Acessar bancos"][ultimoF]), texto: "acessaram bancos pela internet, contra " + pct(F.valores["Acessar bancos"][anosF.indexOf("2022")]) + " em 2022.", fonte: "tic2025" },
        ],
        leitura: "O uso de serviços mais complexos pode ser menor que o de mensagens. Vale medir onde as pessoas abandonam o fluxo digital e oferecer ajuda nesses pontos, em vez de supor que quem tem internet resolve sozinho.",
        limite: "Percentuais entre quem usou a internet; uma pessoa pode marcar mais de uma finalidade. O dado mede uso, não dificuldade.",
      },
      {
        titulo: "Domicílios sem internet têm renda menor",
        fatos: [
          { numero: money(renda.valores["Sem Internet"]), texto: "é o rendimento médio mensal real per capita dos domicílios sem internet, contra " + money(renda.valores["Com Internet"]) + " nos com internet (" + fmt(DER.renda_razao_pct, 1) + "% maior).", extra: "Entre os domicílios sem internet, " + pct(Mdom["Serviço caro"]) + " apontaram serviço caro e " + pct(Mdom["Ninguém sabia usar"]) + " disseram que ninguém sabia usar.", fonte: renda.fonte, nota: renda.nota },
        ],
        leitura: "Pode ser prudente oferecer alternativas que não exijam plano de dados e páginas leves para quem acessa por conexão limitada.",
        limite: "Renda média por domicílio mostra associação, não prova que o custo seja a causa da falta de internet.",
      },
    ];
    var raiz = $("atendimento");
    cartoes.forEach(function (c) {
      var art = htmlEl("article", "atend", null, raiz);
      htmlEl("h3", null, c.titulo, art);
      var fato = blocoAtend(art, "fato", "Fato");
      c.fatos.forEach(function (f) {
        htmlEl("p", "fato-numero", f.numero, fato);
        htmlEl("p", "fato-texto", f.texto, fato);
        if (f.extra) htmlEl("p", "fato-extra", f.extra, fato);
        var fonte = htmlEl("p", "fonte-linha", null, fato);
        escreverFonte(fonte, f.fonte);
        if (f.nota) fonte.appendChild(document.createTextNode(". Nota do dado: " + f.nota));
      });
      var leitura = blocoAtend(art, "leitura", "Leitura");
      htmlEl("p", null, c.leitura, leitura);
      var limite = blocoAtend(art, "limite", "Limitação");
      htmlEl("p", null, c.limite, limite);
    });
  }

  function iniciarSimulador() {
    var R = D.recortes_2025;
    var foraRec = DER.fora.recortes_2025;
    var perfis = [{ chave: "brasil", grupo: null, rotulo: "Brasil (média nacional)", uso: D.series.internet_pessoas.valores[ANO_ATUAL], fora: DER.fora.internet_pessoas[ANO_ATUAL], fonte: D.series.internet_pessoas.fonte }];
    function adicionar(idRecorte, grupo, categorias) {
      categorias.forEach(function (cat) {
        perfis.push({ chave: idRecorte + ":" + cat, grupo: grupo, rotulo: cat, uso: R[idRecorte].valores[cat], fora: foraRec[idRecorte][cat], fonte: R[idRecorte].fonte });
      });
    }
    adicionar("regiao", "Região", Object.keys(R.regiao.valores));
    adicionar("area", "Área", Object.keys(R.area.valores));
    adicionar("idade", "Idade", ["60 anos ou mais"]);
    adicionar("instrucao", "Instrução", ["Sem instrução"]);

    var select = $("sim-perfil");
    var grupoAtual = null;
    var pai = select;
    perfis.forEach(function (p) {
      if (p.grupo !== grupoAtual) {
        grupoAtual = p.grupo;
        pai = grupoAtual ? htmlEl("optgroup", null, null, select) : select;
        if (grupoAtual) pai.label = grupoAtual;
      }
      var o = htmlEl("option", null, p.rotulo, pai);
      o.value = p.chave;
    });

    var entrada = $("sim-base");
    var saida = $("sim-resultado");
    var barra = $("sim-barra");

    function lerBase() {
      var digitos = entrada.value.replace(/\D/g, "");
      if (!digitos) return null;
      var n = parseInt(digitos.slice(0, 10), 10);
      return isNaN(n) ? null : n;
    }

    function desenharBarra(foraPct, usoPct) {
      limpar(barra);
      var w = Math.round(barra.getBoundingClientRect().width) || 300;
      var h = 40;
      var s = svgEl("svg", { viewBox: "0 0 " + w + " " + h, width: w, height: h, "aria-hidden": "true" }, barra);
      var larguraFora = Math.max(2, (foraPct / 100) * w);
      svgEl("rect", { x: 0, y: 4, width: w, height: 32, rx: 10, class: "b-barra", style: "animation:none;opacity:.72" }, s);
      svgEl("rect", { x: 0, y: 4, width: larguraFora, height: 32, rx: 10, class: "b-barra b-barra-dest", style: "animation:none" }, s);
      var t1 = svgEl("text", { x: larguraFora + 10, y: 25, class: "b-valor", fill: "currentColor" }, s);
      t1.textContent = "Sem internet " + pct(foraPct);
      if (larguraFora + 10 + 150 > w) {
        t1.setAttribute("x", Math.max(6, larguraFora - 8));
        t1.setAttribute("text-anchor", "end");
        t1.textContent = pct(foraPct);
      }
    }

    function atualizar() {
      var perfil = perfis.filter(function (p) { return p.chave === select.value; })[0];
      var base = lerBase();
      limpar(saida);
      if (base === null || base === 0) {
        htmlEl("p", "sim-linha", "Digite um tamanho de base maior que zero para ver a estimativa.", saida);
        limpar(barra);
        return;
      }
      var bruto = (base * perfil.fora) / 100;
      var estimado = Math.round(bruto);
      var numero = htmlEl("p", "sim-numero", null, saida);
      numero.appendChild(document.createTextNode(bruto > 0 && bruto < 1 ? "menos de 1" : fmt(estimado, 0)));
      htmlEl("small", null, "pessoas provavelmente sem internet", numero);
      var linha = htmlEl("p", "sim-linha", null, saida);
      linha.textContent =
        "Numa base de " + fmt(base, 0) + " pessoas com o perfil “" + perfil.rotulo + "”, " + pct(perfil.fora) + " não usaram a internet em " + ANO_ATUAL + ". Cerca de " + fmt(Math.max(0, base - estimado), 0) + " usaram.";
      var f = htmlEl("p", "sim-formula", null, saida);
      f.textContent = "Conta: " + fmt(base, 0) + " × (100 - " + fmt(perfil.uso, 1) + ") ÷ 100 = " + (bruto > 0 && bruto < 1 ? fmt(bruto, 2) : fmt(estimado, 0)) + ". ";
      escreverFonte(f, perfil.fonte);
      desenharBarra(perfil.fora, perfil.uso);
    }

    entrada.addEventListener("input", atualizar);
    entrada.addEventListener("blur", function () {
      var n = lerBase();
      if (n !== null) entrada.value = fmt(n, 0);
    });
    select.addEventListener("change", atualizar);
    aoRedimensionar(barra, function () {
      atualizar();
    });
    atualizar();
  }

  function desenharMini(host, valores, anos, w) {
    limpar(host);
    var h = 64;
    var padX = 6;
    var xs = anos.map(Number);
    var xMin = xs[0];
    var xMax = xs[xs.length - 1];
    function X(a) {
      return padX + ((a - xMin) / (xMax - xMin)) * (w - 2 * padX);
    }
    var presentes = valores.filter(function (v) { return v !== null; });
    var vMin = Math.min.apply(null, presentes);
    var vMax = Math.max.apply(null, presentes);
    var folga = (vMax - vMin) * 0.15 || 2;
    vMin -= folga;
    vMax += folga;
    function Y(v) {
      return 7 + (1 - (v - vMin) / (vMax - vMin)) * (h - 14);
    }
    var s = svgEl("svg", { viewBox: "0 0 " + w + " " + h, width: w, height: h, "aria-hidden": "true" }, host);
    svgEl("line", { x1: 0, x2: w, y1: h - 1, y2: h - 1, class: "g-grade" }, s);
    var solido = "";
    var tracejado = "";
    for (var i = 0; i < xs.length - 1; i++) {
      if (valores[i] === null || valores[i + 1] === null) continue;
      var seg = "M" + X(xs[i]) + " " + Y(valores[i]) + "L" + X(xs[i + 1]) + " " + Y(valores[i + 1]);
      if (xs[i + 1] - xs[i] > 1) tracejado += seg;
      else solido += seg;
    }
    if (tracejado) svgEl("path", { d: tracejado, class: "g-mini-linha", "stroke-dasharray": "5 4", opacity: 0.85 }, s);
    if (solido) svgEl("path", { d: solido, class: "g-mini-linha" }, s);
    xs.forEach(function (a, i) {
      if (valores[i] === null) return;
      svgEl("circle", { cx: X(a), cy: Y(valores[i]), r: i === xs.length - 1 ? 4 : 3, class: "g-mini-ponto" }, s);
    });
  }

  function iniciarUso() {
    var F = D.finalidades;
    var E = D.equipamentos;
    var ult = F.anos.length - 1;
    var nomes = Object.keys(F.valores);
    var topo = nomes.slice().sort(function (a, b) { return F.valores[b][ult] - F.valores[a][ult]; }).slice(0, 3);
    $("lead-uso").textContent =
      "Entre quem usou a internet em " + F.anos[ult] + ", " + listaPt(topo.map(function (n) { return n.toLowerCase() + " (" + pct(F.valores[n][ult]) + ")"; })) + " lideram. Acessar bancos foi de " +
      pct(F.valores["Acessar bancos"][F.anos.indexOf("2022")]) + " em 2022 para " + pct(F.valores["Acessar bancos"][ult]) + " em " + F.anos[ult] + ", e usar serviço público, de " +
      pct(F.valores["Usar serviço público"][F.anos.indexOf("2022")]) + " para " + pct(F.valores["Usar serviço público"][ult]) + ".";

    var raiz = $("multiplos");
    nomes.forEach(function (nome) {
      var v = F.valores[nome];
      var primeiro = 0;
      while (v[primeiro] === null) primeiro++;
      var d = Math.round((v[ult] - v[primeiro]) * 10) / 10;
      var mini = htmlEl("article", "mini", null, raiz);
      htmlEl("h4", "mini-titulo", nome, mini);
      htmlEl("p", "mini-valor", pct(v[ult]), mini);
      htmlEl("p", "mini-delta", pp(d) + " desde " + F.anos[primeiro], mini);
      var hostMini = htmlEl("div", "mini-grafico", null, mini);
      var eixo = htmlEl("div", "mini-eixo", null, mini);
      htmlEl("span", null, F.anos[0], eixo);
      htmlEl("span", null, F.anos[ult], eixo);
      aoRedimensionar(hostMini, function (w) {
        desenharMini(hostMini, v, F.anos, w);
      });
    });
    var nota = $("nota-multiplos");
    escreverFonte(nota, F.fonte);
    nota.appendChild(document.createTextNode(". Cada pessoa pode ter mais de uma finalidade, por isso os valores não somam 100%. Anos sem dado são lacuna na linha, não zero. Cada minigráfico tem escala própria, então compare pelo valor e pela variação em p.p., não pela inclinação. Anos disponíveis: " + listaPt(F.anos) + "."));
    montarTabela($("tabela-multiplos"), {
      legenda: F.rotulo + " (%).",
      colunas: ["Finalidade"].concat(F.anos),
      primeira: "Finalidade",
      linhas: nomes.map(function (n) {
        return [n].concat(F.valores[n].map(function (x) { return x === null ? "sem dado" : fmt(x, 1); }));
      }),
      rodape: "Fonte: " + fonteCurta(F.fonte) + ".",
    });

    var formas = { Celular: ["cor-lilas", "circulo"], Televisão: ["cor-ciano", "quadrado"], Computador: ["cor-magenta", "triangulo"], Tablet: ["cor-suave", "losango"] };
    var series = Object.keys(E.valores).map(function (n) {
      var valores = {};
      E.anos.forEach(function (a, i) {
        valores[a] = E.valores[n][i];
      });
      return { id: n, rotulo: n, cor: formas[n][0], forma: formas[n][1], valores: valores, dados: null };
    });
    var leg = $("legenda-equip");
    series.forEach(function (sr) {
      var item = htmlEl("span", "legenda-item " + sr.cor, null, leg);
      item.innerHTML = iconeMarcador(sr.forma, false);
      item.appendChild(document.createTextNode(sr.rotulo));
    });
    legendaItem(leg, '<svg viewBox="0 0 22 14" width="22" height="14" aria-hidden="true"><path d="M1 7h20" class="g-linha" style="stroke:var(--texto-2);stroke-width:2" stroke-dasharray="4 3"/></svg>', "Tracejado: anos sem dado");
    var ue = E.anos.length - 1;
    var nE = $("nota-equip");
    escreverFonte(nE, E.fonte);
    nE.appendChild(document.createTextNode(
      ". Em " + E.anos[ue] + ", o celular lidera (" + pct(E.valores["Celular"][ue]) + "); a televisão foi de " + pct(E.valores["Televisão"][0]) + " em " + E.anos[0] + " para " + pct(E.valores["Televisão"][ue]) +
      ", e o computador, de " + pct(E.valores["Computador"][0]) + " para " + pct(E.valores["Computador"][ue]) + ". Uma pessoa pode usar mais de um equipamento, por isso os valores somam mais de 100%."
    ));
    montarLinhas($("grafico-equip"), {
      series: series,
      yMin: 0,
      yMax: 100,
      yTicks: [0, 25, 50, 75, 100],
      fonte: E.fonte,
      aria: "Gráfico de linhas: equipamentos usados para acessar a internet, de " + E.anos[0] + " a " + E.anos[ue] + ". Celular, televisão, computador e tablet. Use as setas para ler cada ano.",
    });
    montarTabela($("tabela-equip"), {
      legenda: E.rotulo + " (%).",
      colunas: ["Equipamento"].concat(E.anos),
      primeira: "Equipamento",
      linhas: Object.keys(E.valores).map(function (n) {
        return [n].concat(E.valores[n].map(function (x) { return fmt(x, 1); }));
      }),
      rodape: "Fonte: " + fonteCurta(E.fonte) + ".",
    });
  }

  function iniciarRodape() {
    var lista = $("lista-fontes");
    Object.keys(D.fontes).forEach(function (id) {
      var f = D.fontes[id];
      var li = htmlEl("li", null, null, lista);
      var a = htmlEl("a", null, f.titulo, li);
      a.href = f.url;
      a.rel = "noopener";
      var meta = [];
      if (f.referencia) meta.push("Período de referência: " + f.referencia);
      if (f.divulgacao) meta.push("Divulgação: " + dataBr(f.divulgacao));
      if (meta.length) htmlEl("span", "fonte-meta", meta.join(" · "), li);
    });
    var notas = $("lista-notas");
    D.notas.forEach(function (n) {
      htmlEl("li", null, n, notas);
    });
    var ant = anosAnteriores(["internet_pessoas", "internet_urbano", "internet_rural", "celular_pessoas", "internet_60mais"]);
    if (ant.length) {
      htmlEl(
        "li",
        null,
        "Pontos de divulgação anterior (" + fonteCurta("tic2024") + "): " + ant.map(function (x) { return x.rotulo + " em " + listaPt(x.anos); }).join("; ") + ". Aparecem com marcador vazado nos gráficos e com asterisco nas tabelas.",
        notas
      );
    }
    htmlEl("li", null, "Os gráficos usam o ano real no eixo horizontal. Onde a série não tem dado, a linha é tracejada ou fica em branco, e nunca vira zero.", notas);
    htmlEl("li", null, "Atualizado em " + dataBr(D.atualizado_em) + ". Os valores foram transcritos dos informativos do IBGE e conferidos contra a fonte; a cobertura de imprensa serviu só para conferência.", notas);
  }

  function csvCampo(v) {
    var t = String(v);
    return /[",\n]/.test(t) ? '"' + t.replace(/"/g, '""') + '"' : t;
  }
  function gerarCsv() {
    var linhas = [["bloco", "indicador", "rotulo", "categoria", "ano", "valor", "unidade", "fonte", "divulgacao_anterior"]];
    Object.keys(D.series).forEach(function (id) {
      var s = D.series[id];
      anosOrdenados(s.valores).forEach(function (a) {
        linhas.push(["series", id, s.rotulo, "", a, s.valores[a], s.unidade, fonteDoAno(s, a), ehAnterior(s, a) ? "sim" : "nao"]);
      });
    });
    Object.keys(D.recortes_2025).forEach(function (id) {
      var r = D.recortes_2025[id];
      Object.keys(r.valores).forEach(function (cat) {
        linhas.push(["recortes_2025", id, r.rotulo, cat, ANO_ATUAL, r.valores[cat], r.unidade, r.fonte, "nao"]);
      });
    });
    ["motivos_pessoas_2025", "motivos_domicilios_2025", "sem_celular_motivos_2025"].forEach(function (id) {
      var b = D[id];
      Object.keys(b.valores).forEach(function (cat) {
        linhas.push([id, id, b.rotulo, cat, ANO_ATUAL, b.valores[cat], b.unidade, b.fonte, "nao"]);
      });
    });
    ["finalidades", "equipamentos"].forEach(function (id) {
      var b = D[id];
      Object.keys(b.valores).forEach(function (cat) {
        b.anos.forEach(function (a, i) {
          var v = b.valores[cat][i];
          if (v === null) return;
          linhas.push([id, id, b.rotulo, cat, a, v, b.unidade, b.fonte, "nao"]);
        });
      });
    });
    return "﻿" + linhas.map(function (l) { return l.map(csvCampo).join(","); }).join("\r\n") + "\r\n";
  }
  function iniciarCsv() {
    $("baixar-csv").addEventListener("click", function () {
      var blob = new Blob([gerarCsv()], { type: "text/csv;charset=utf-8" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "fora-do-digital-pnad-tic.csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () {
        URL.revokeObjectURL(url);
      }, 1000);
    });
  }

  iniciarTema();
  iniciarHero();
  iniciarPontos();
  iniciarKpis();
  iniciarLinhas();
  iniciarMotivos();
  iniciarRecortes();
  iniciarAtendimento();
  iniciarSimulador();
  iniciarUso();
  iniciarRodape();
  iniciarCsv();
})();
