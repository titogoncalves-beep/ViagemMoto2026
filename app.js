/* Contas Viagem Moto 2026 — lógica e UI (vanilla JS) */
(() => {
  const STORAGE_KEY = 'viagem_moto_2026_v1';

  const fmtEUR = new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' });
  const fmtNum = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 });

  const $ = (id) => document.getElementById(id);

  const defaults = window.__DEFAULT_DATA__;

  function safeNumber(x, fallback = 0){
    const n = Number(x);
    return Number.isFinite(n) ? n : fallback;
  }

  function calcFuel(kms, cons, price){
    return safeNumber(kms) * (safeNumber(cons)/100) * safeNumber(price);
  }

  function calcHotel(night, garage){
    return safeNumber(night) + safeNumber(garage);
  }

  function derive(model){
    const people = Math.max(1, Math.round(safeNumber(model.inputs.people, 1)));
    const cons = safeNumber(model.inputs.consumption_l_per_100km);
    const price = safeNumber(model.inputs.price_per_liter_eur);
    const mealsPerDay = safeNumber(model.inputs.meals_per_day_eur);

    const days = model.days.map(d => {
      const hotel = calcHotel(d.night_eur, d.garage_eur);
      const fuel = calcFuel(d.kms, cons, price);
      return { ...d, hotel_eur: hotel, fuel_eur: fuel };
    });

    const totalHotelGroup = days.reduce((a,d)=>a + d.hotel_eur, 0);
    const totalKms = days.reduce((a,d)=>a + safeNumber(d.kms), 0);
    const totalFuel = days.reduce((a,d)=>a + d.fuel_eur, 0);
    const mealsTotal = mealsPerDay * days.length;

    const hotelPerPerson = totalHotelGroup / people;
    const billedNights = Math.max(1, (days.filter(d=>d.hotel_eur>0).length || days.length || 1));
    const avgHotelDay = hotelPerPerson / billedNights;

    const totalPerPerson = hotelPerPerson + totalFuel + mealsTotal;

    return {
      people, cons, price, mealsPerDay,
      days,
      totalHotelGroup,
      totalKms,
      totalFuel,
      mealsTotal,
      hotelPerPerson,
      avgHotelDay,
      totalPerPerson
    };
  }

  function loadModel(){
    try{
      const raw = localStorage.getItem(STORAGE_KEY);
      if(!raw) return structuredClone(defaults);
      const parsed = JSON.parse(raw);
      return {
        ...structuredClone(defaults),
        ...parsed,
        inputs: { ...structuredClone(defaults.inputs), ...(parsed.inputs||{}) },
        days: Array.isArray(parsed.days) && parsed.days.length ? parsed.days : structuredClone(defaults.days),
        hotels: Array.isArray(parsed.hotels) ? parsed.hotels : structuredClone(defaults.hotels)
      };
    }catch{
      return structuredClone(defaults);
    }
  }

  function saveModel(model){
    localStorage.setItem(STORAGE_KEY, JSON.stringify(model));
  }

  function setTheme(next){
    document.documentElement.dataset.theme = next;
    localStorage.setItem('viagem_moto_2026_theme', next);
  }

  function initTheme(){
    const saved = localStorage.getItem('viagem_moto_2026_theme');
    if(saved){ setTheme(saved); return; }
    const prefersLight = window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches;
    setTheme(prefersLight ? 'light' : 'dark');
  }

  function renderLinks(model){
    const routes = $('routesList');
    const hotels = $('hotelsList');
    routes.innerHTML = '';
    hotels.innerHTML = '';

    model.days.forEach(d => {
      const li = document.createElement('li');
      const a = document.createElement('a');
      a.href = d.route_url || '#';
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.textContent = `${d.label}${d.route ? ' — ' + d.route : ''}`;
      li.appendChild(a);
      routes.appendChild(li);
    });

    (model.hotels||[]).forEach(h => {
      const li = document.createElement('li');
      if(h.url){
        const a = document.createElement('a');
        a.href = h.url;
        a.target = '_blank';
        a.rel = 'noreferrer';
        a.textContent = h.name || 'Hotel';
        li.appendChild(a);
      } else {
        li.textContent = h.name || 'Hotel';
      }
      hotels.appendChild(li);
    });
  }

  function render(model){
    $('pageTitle').textContent = model.title || 'Contas Viagem Moto 2026';
    $('pageSubtitle').textContent = model.subtitle || '';

    $('inpPeople').value = model.inputs.people;
    $('inpConsumption').value = model.inputs.consumption_l_per_100km;
    $('inpPrice').value = model.inputs.price_per_liter_eur;
    $('inpMeals').value = model.inputs.meals_per_day_eur;

    const tbody = $('daysTbody');
    tbody.innerHTML = '';

    const mobile = $('mobileDays');
    mobile.innerHTML = '';

    const derived = derive(model);

    const makeInput = (val, cls, step, min=0) => {
      const inp = document.createElement('input');
      inp.type = 'number';
      inp.className = `cellInput ${cls||''}`.trim();
      inp.step = step;
      inp.min = String(min);
      inp.value = (val ?? 0);
      return inp;
    };

    derived.days.forEach((d, idx) => {
      const tr = document.createElement('tr');

      const tdDay = document.createElement('td');
      tdDay.innerHTML = `<strong>${d.label || ('Dia ' + (idx+1))}</strong>`;

      // Route editor (name + link)
      const tdRoute = document.createElement('td');
      const routeWrap = document.createElement('div');
      routeWrap.className = 'routeCell';
      const inpRoute = document.createElement('input');
      inpRoute.type = 'text';
      inpRoute.value = d.route || '';
      inpRoute.placeholder = 'Percurso (ex.: Leon)';
      const btnLink = document.createElement('button');
      btnLink.className = 'iconBtn';
      btnLink.title = 'Editar link do percurso';
      btnLink.textContent = '🔗';
      const aPill = document.createElement('a');
      aPill.className = 'pill';
      aPill.href = d.route_url || '#';
      aPill.target = '_blank';
      aPill.rel = 'noreferrer';
      aPill.textContent = d.route ? d.route : 'Abrir';
      if(!d.route_url) aPill.style.display = 'none';

      routeWrap.appendChild(inpRoute);
      routeWrap.appendChild(btnLink);
      tdRoute.appendChild(routeWrap);
      tdRoute.appendChild(document.createElement('div'));
      tdRoute.lastChild.style.marginTop = '6px';
      tdRoute.lastChild.appendChild(aPill);

      const tdNight = document.createElement('td');
      const inpNight = makeInput(d.night_eur, '', '1');
      tdNight.appendChild(inpNight);

      const tdGarage = document.createElement('td');
      const inpGarage = makeInput(d.garage_eur, '', '1');
      tdGarage.appendChild(inpGarage);

      const tdHotel = document.createElement('td');
      tdHotel.textContent = fmtEUR.format(d.hotel_eur);

      const tdKms = document.createElement('td');
      const inpKms = makeInput(d.kms, 'kms', '1');
      tdKms.appendChild(inpKms);

      const tdFuel = document.createElement('td');
      tdFuel.textContent = fmtEUR.format(d.fuel_eur);

      const tdDel = document.createElement('td');
      const btnDel = document.createElement('button');
      btnDel.className = 'iconBtn';
      btnDel.title = 'Remover dia';
      btnDel.textContent = '🗑️';
      tdDel.appendChild(btnDel);

      [tdDay, tdRoute, tdNight, tdGarage, tdHotel, tdKms, tdFuel, tdDel].forEach(td => tr.appendChild(td));
      tbody.appendChild(tr);

      const commit = () => { saveModel(model); render(model); };

      const onChange = () => {
        model.days[idx].night_eur = safeNumber(inpNight.value);
        model.days[idx].garage_eur = safeNumber(inpGarage.value);
        model.days[idx].kms = safeNumber(inpKms.value);
        commit();
      };
      inpNight.addEventListener('input', onChange);
      inpGarage.addEventListener('input', onChange);
      inpKms.addEventListener('input', onChange);

      inpRoute.addEventListener('input', () => {
        model.days[idx].route = inpRoute.value;
        commit();
      });

      btnLink.addEventListener('click', () => {
        const cur = model.days[idx].route_url || '';
        const next = prompt('URL do percurso (Google Maps)', cur);
        if(next === null) return;
        model.days[idx].route_url = next.trim();
        commit();
      });

      btnDel.addEventListener('click', () => {
        model.days.splice(idx, 1);
        model.days.forEach((x,i)=>{ x.day = i+1; x.label = 'Dia ' + (i+1); });
        commit();
      });

      // Mobile card
      const card = document.createElement('div');
      card.className = 'dayCard';
      card.innerHTML = `
        <div class="head">
          <strong>${d.label || ('Dia ' + (idx+1))}</strong>
          <button class="iconBtn" data-del="${idx}" title="Remover dia">🗑️</button>
        </div>
        <div class="grid2" style="margin-top:10px;">
          <label class="field"><span>Percurso</span><input type="text" value="${(d.route||'').replaceAll('"','&quot;')}" data-route="${idx}" placeholder="Percurso"></label>
          <label class="field"><span>Link do percurso</span><input type="text" value="${(d.route_url||'').replaceAll('"','&quot;')}" data-routeurl="${idx}" placeholder="https://..."></label>
          <label class="field"><span>Noite (grupo) €</span><input type="number" step="1" min="0" value="${safeNumber(d.night_eur)}" data-night="${idx}"></label>
          <label class="field"><span>Garagem €</span><input type="number" step="1" min="0" value="${safeNumber(d.garage_eur)}" data-garage="${idx}"></label>
          <label class="field"><span>Kms</span><input type="number" step="1" min="0" value="${safeNumber(d.kms)}" data-kms="${idx}"></label>
          <div class="field"><span>Total Hotel (dia)</span><div style="padding:10px 12px;border:1px solid var(--border);border-radius:14px;background:var(--panel2);">${fmtEUR.format(d.hotel_eur)}</div></div>
          <div class="field"><span>Combustível (dia)</span><div style="padding:10px 12px;border:1px solid var(--border);border-radius:14px;background:var(--panel2);">${fmtEUR.format(d.fuel_eur)}</div></div>
        </div>
      `;
      mobile.appendChild(card);
    });

    $('outHotelPerPerson').textContent = fmtEUR.format(derived.hotelPerPerson);
    $('outFuel').textContent = fmtEUR.format(derived.totalFuel);
    $('outMeals').textContent = fmtEUR.format(derived.mealsTotal);
    $('outTotal').textContent = fmtEUR.format(derived.totalPerPerson);

    $('outKms').textContent = fmtNum.format(derived.totalKms);
    $('outHotelGroup').textContent = fmtEUR.format(derived.totalHotelGroup);
    $('outAvgHotelDay').textContent = fmtEUR.format(derived.avgHotelDay);

    $('tfHotelGroup').textContent = fmtEUR.format(derived.totalHotelGroup);
    $('tfKms').textContent = fmtNum.format(derived.totalKms);
    $('tfFuel').textContent = fmtEUR.format(derived.totalFuel);

    renderLinks(model);

    // Mobile inputs delegation
    $('mobileDays').querySelectorAll('input[data-night], input[data-garage], input[data-kms], input[data-route], input[data-routeurl]').forEach(inp => {
      inp.addEventListener('input', () => {
        const idx = Number(inp.dataset.night ?? inp.dataset.garage ?? inp.dataset.kms ?? inp.dataset.route ?? inp.dataset.routeurl);
        if(Number.isNaN(idx)) return;
        if(inp.dataset.night !== undefined) model.days[idx].night_eur = safeNumber(inp.value);
        if(inp.dataset.garage !== undefined) model.days[idx].garage_eur = safeNumber(inp.value);
        if(inp.dataset.kms !== undefined) model.days[idx].kms = safeNumber(inp.value);
        if(inp.dataset.route !== undefined) model.days[idx].route = inp.value;
        if(inp.dataset.routeurl !== undefined) model.days[idx].route_url = inp.value;
        saveModel(model);
        render(model);
      });
    });
    $('mobileDays').querySelectorAll('button[data-del]').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.del);
        if(Number.isNaN(idx)) return;
        model.days.splice(idx, 1);
        model.days.forEach((x,i)=>{ x.day = i+1; x.label = 'Dia ' + (i+1); });
        saveModel(model);
        render(model);
      });
    });

    // Inputs events
    $('inpPeople').oninput = (e) => { model.inputs.people = safeNumber(e.target.value, 1); saveModel(model); render(model); };
    $('inpConsumption').oninput = (e) => { model.inputs.consumption_l_per_100km = safeNumber(e.target.value); saveModel(model); render(model); };
    $('inpPrice').oninput = (e) => { model.inputs.price_per_liter_eur = safeNumber(e.target.value); saveModel(model); render(model); };
    $('inpMeals').oninput = (e) => { model.inputs.meals_per_day_eur = safeNumber(e.target.value); saveModel(model); render(model); };
  }

  function downloadText(filename, text, mime='text/plain'){
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 500);
  }

  function main(){
    initTheme();

    let model = loadModel();

    $('toggleTheme').addEventListener('click', () => {
      const cur = document.documentElement.dataset.theme || 'dark';
      setTheme(cur === 'dark' ? 'light' : 'dark');
    });

    $('btnPrint').addEventListener('click', () => window.print());

    $('btnReset').addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEY);
      model = structuredClone(defaults);
      saveModel(model);
      render(model);
    });

    $('btnAddDay').addEventListener('click', () => {
      const next = model.days.length + 1;
      model.days.push({ day: next, label: 'Dia ' + next, route: '', route_url: '', night_eur: 0, garage_eur: 0, kms: 0 });
      saveModel(model);
      render(model);
    });

    $('btnExport').addEventListener('click', () => {
      downloadText('contas_viagem_moto_2026.json', JSON.stringify(model, null, 2), 'application/json');
    });

    $('fileImport').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if(!file) return;
      try{
        const parsed = JSON.parse(await file.text());
        if(!parsed || typeof parsed !== 'object') throw new Error('Formato inválido');
        model = {
          ...structuredClone(defaults),
          ...parsed,
          inputs: { ...structuredClone(defaults.inputs), ...(parsed.inputs||{}) },
          days: Array.isArray(parsed.days) ? parsed.days : structuredClone(defaults.days),
          hotels: Array.isArray(parsed.hotels) ? parsed.hotels : structuredClone(defaults.hotels)
        };
        saveModel(model);
        render(model);
      } catch {
        alert('Não foi possível importar. Verifica se o ficheiro é JSON válido.');
      } finally {
        e.target.value = '';
      }
    });

    render(model);
  }

  document.addEventListener('DOMContentLoaded', main);
})();
