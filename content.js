(function () {
    'use strict';

    console.log('[MIPT Topic Filter] Скрипт запущен (Main World)');

    var MAX_ATTEMPTS = 100;   // ~20 секунд ожидания
    var attempts = 0;

    function boot() {
        var $ = window.jQuery;
        if (!$ || !$.fn || !$.fn.dataTable) {
            return retry('jQuery или DataTables еще не загрузились');
        }

        var table = document.querySelector('table.dataTables-example')
        || document.querySelector('table.dataTable')
        || document.querySelector('table[id^="DataTables_Table_"]');

        if (!table) return retry('Таблица не найдена в DOM');

        if (!$.fn.dataTable.isDataTable(table)) return retry('Таблица не инициализирована как DataTable');

        try {
            init($, table);
            console.log('[MIPT Topic Filter] Успешно инициализировано');
        } catch (e) {
            console.error('[MIPT Topic Filter] Ошибка при инициализации:', e);
        }
    }

    function retry(reason) {
        if (++attempts > MAX_ATTEMPTS) {
            console.warn('[MIPT Topic Filter] Не дождались готовности. Причина: ' + reason);
            return;
        }
        setTimeout(boot, 200);
    }

    function init($, table) {
        var dt = $(table).DataTable();
        addShowAllOption(table, dt);
        addTopicFilter($, table, dt);
    }

    function addShowAllOption(table, dt) {
        var wrapper = table.closest('.dataTables_wrapper');
        if (!wrapper) return;

        var select = wrapper.querySelector('select[name$="_length"]');
        if (!select) return;

        if (!select.querySelector('option[value="-1"]')) {
            var opt = document.createElement('option');
            opt.value = '-1';
            opt.textContent = 'Все';
            select.appendChild(opt);
        }

        if (dt.page.len() === -1 && select.value !== '-1') {
            select.value = '-1';
        }

        if (!select.dataset.miptAllBound) {
            select.dataset.miptAllBound = '1';
            select.addEventListener('change', function () {
                if (this.value === '-1') {
                    dt.page.len(-1);
                }
            });
        }
    }

    function addTopicFilter($, table, dt) {
        if (table.dataset.miptTopicFilterApplied === '1') return;
        table.dataset.miptTopicFilterApplied = '1';

        var topicsSet = new Set();
        dt.rows().nodes().each(function (row) {
            var td = row.children && row.children[1];
            if (!td) return;
            var text = (td.textContent || '').trim();
            if (text) topicsSet.add(text);
        });

            var topics = Array.from(topicsSet).sort(function (a, b) {
                return a.localeCompare(b, 'ru');
            });

            var container = document.createElement('div');
            container.className = 'mipt-topic-filter';

            var label = document.createElement('label');
            label.setAttribute('for', 'mipt-topic-filter-select');
            label.textContent = 'Фильтр по теме:';

            var select = document.createElement('select');
            select.id = 'mipt-topic-filter-select';

            var allOpt = document.createElement('option');
            allOpt.value = '';
            allOpt.textContent = '— Все темы (' + topics.length + ') —';
            select.appendChild(allOpt);

            topics.forEach(function (t) {
                var opt = document.createElement('option');
                opt.value = t;
                opt.textContent = t;
                select.appendChild(opt);
            });

            var reset = document.createElement('button');
            reset.type = 'button';
            reset.className = 'mipt-topic-filter-reset';
            reset.textContent = 'Сбросить';
            reset.disabled = true;

            container.appendChild(label);
            container.appendChild(select);
            container.appendChild(reset);

            var wrapper = table.closest('.dataTables_wrapper') || table;
            (wrapper.parentNode || wrapper).insertBefore(container, wrapper);

            var currentTopic = '';

            $.fn.dataTable.ext.search.push(function (settings, data) {
                if (settings.nTable !== table) return true;
                if (!currentTopic) return true;
                var raw = data && data[1] != null ? String(data[1]) : '';
                return stripHtml(raw) === currentTopic;
            });

            select.addEventListener('change', function () {
                currentTopic = this.value;
                reset.disabled = !currentTopic;
                dt.draw();
            });

            reset.addEventListener('click', function () {
                select.value = '';
                currentTopic = '';
                reset.disabled = true;
                dt.draw();
            });
    }

    function stripHtml(html) {
        var tmp = document.createElement('div');
        tmp.innerHTML = html;
        return (tmp.textContent || tmp.innerText || '').trim();
    }

    boot();
})();
