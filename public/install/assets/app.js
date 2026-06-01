/*
 * Installation Wizard - frontend logic
 * Plain ES6, no dependencies. Communicates with /install/api.php
 */

(function () {
    'use strict';

    const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';

    async function api(action, body) {
        const res = await fetch('api.php?action=' + encodeURIComponent(action), {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': csrf,
                'Accept': 'application/json',
            },
            body: JSON.stringify(Object.assign({ _csrf: csrf }, body || {})),
        });

        let data;
        try {
            data = await res.json();
        } catch (_e) {
            throw new Error('Server returned a non-JSON response (HTTP ' + res.status + ').');
        }

        if (!data.ok) {
            throw new Error(data.error || 'Request failed (HTTP ' + res.status + ').');
        }
        return data;
    }

    function setResult(el, kind, message) {
        if (!el) return;
        el.hidden = false;
        el.className = 'wiz-result wiz-result--' + (kind === 'ok' ? 'ok' : 'bad');
        el.textContent = message;
    }

    // --- Database step ---------------------------------------------------------

    const dbForm = document.getElementById('db-form');
    if (dbForm) {
        const connectionSelect = dbForm.querySelector('#db_connection');
        const serverFields = dbForm.querySelector('[data-driver-fields="server"]');
        const sqliteFields = dbForm.querySelector('[data-driver-fields="sqlite"]');
        const resultEl = document.getElementById('db-result');
        const testBtn = dbForm.querySelector('[data-action-button="test-db"]');

        function toggleDriverFields() {
            const isSqlite = connectionSelect.value === 'sqlite';
            serverFields.hidden = isSqlite;
            sqliteFields.hidden = !isSqlite;
            ['host', 'port', 'database', 'username'].forEach((n) => {
                const inp = dbForm.querySelector('[name="' + n + '"]');
                if (inp) inp.required = !isSqlite && n === 'database';
            });
        }
        connectionSelect.addEventListener('change', toggleDriverFields);
        toggleDriverFields();

        function collect() {
            const fd = new FormData(dbForm);
            const obj = {};
            fd.forEach((v, k) => { obj[k] = v; });
            return obj;
        }

        testBtn?.addEventListener('click', async () => {
            testBtn.disabled = true;
            testBtn.textContent = 'Testing…';
            resultEl.hidden = true;
            try {
                const res = await api('test-db', collect());
                setResult(resultEl, 'ok', res.message || 'Connection successful.');
            } catch (e) {
                setResult(resultEl, 'bad', e.message);
            } finally {
                testBtn.disabled = false;
                testBtn.textContent = 'Test connection';
            }
        });

        dbForm.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const submitBtn = dbForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving…';
            resultEl.hidden = true;
            try {
                const res = await api('save-db', collect());
                window.location.href = res.next || '?step=app';
            } catch (e) {
                setResult(resultEl, 'bad', e.message);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save & continue →';
            }
        });
    }

    // --- App settings step -----------------------------------------------------

    const appForm = document.getElementById('app-form');
    if (appForm) {
        const resultEl = document.getElementById('app-result');
        appForm.addEventListener('submit', async (ev) => {
            ev.preventDefault();
            const submitBtn = appForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving…';
            resultEl.hidden = true;

            const fd = new FormData(appForm);
            const obj = {};
            fd.forEach((v, k) => { obj[k] = v; });

            try {
                const res = await api('save-app', obj);
                window.location.href = res.next || '?step=finalize';
            } catch (e) {
                setResult(resultEl, 'bad', e.message);
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save & continue →';
            }
        });
    }

    // --- Finalize step ---------------------------------------------------------

    const runBtn = document.getElementById('run-install');
    if (runBtn) {
        const taskList = document.getElementById('task-list');
        const errorBox = document.getElementById('finalize-error');

        function setTask(id, state, label) {
            const li = taskList.querySelector('[data-task="' + id + '"]');
            if (!li) return;
            li.classList.remove('wiz-task--running', 'wiz-task--ok', 'wiz-task--bad');
            li.classList.add('wiz-task--' + state);
            const stateEl = li.querySelector('.wiz-task-state');
            if (stateEl) stateEl.textContent = label;
        }

        runBtn.addEventListener('click', async () => {
            runBtn.disabled = true;
            runBtn.textContent = 'Installing…';
            errorBox.hidden = true;

            const tasks = Array.from(taskList.querySelectorAll('[data-task]')).map(el => el.dataset.task);

            for (const id of tasks) {
                setTask(id, 'running', 'Running');
                try {
                    const res = await api('run', { task: id });
                    setTask(id, 'ok', 'Done');
                } catch (e) {
                    setTask(id, 'bad', 'Failed');
                    errorBox.hidden = false;
                    errorBox.textContent = 'Task "' + id + '" failed: ' + e.message;
                    runBtn.disabled = false;
                    runBtn.textContent = 'Retry installation';
                    return;
                }
            }

            window.location.href = '?step=done';
        });
    }
})();
