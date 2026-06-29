let todos = [];
let groups = [];
let currentStatusFilter = 'all';
let currentGroupFilter = null;
let selectedIds = new Set();

const GROUP_COLORS = [
  { bg: '#dbeafe', text: '#1d4ed8' },
  { bg: '#dcfce7', text: '#166534' },
  { bg: '#fef9c3', text: '#854d0e' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#ffedd5', text: '#9a3412' },
  { bg: '#e0f2fe', text: '#075985' },
  { bg: '#f0fdf4', text: '#14532d' },
  { bg: '#fdf4ff', text: '#7e22ce' },
];

// ── 모달 ──────────────────────────────────────

function openAddModal() {
  document.getElementById('addModal').classList.add('open');
  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(() => document.getElementById('todoTitle').focus(), 350);
}

function closeAddModal() {
  document.getElementById('addModal').classList.remove('open');
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('todoTitle').value = '';
  document.getElementById('todoDesc').value = '';
  document.getElementById('todoGroup').value = '';
}

// ── 그룹 관리 ────────────────────────────────

function toggleGroupInput() {
  const area = document.getElementById('groupInputArea');
  const isOpen = area.style.display !== 'none';
  area.style.display = isOpen ? 'none' : 'flex';
  if (!isOpen) {
    const input = document.getElementById('newGroupName');
    input.value = '';
    input.focus();
  }
}

function addGroup() {
  const input = document.getElementById('newGroupName');
  const name = input.value.trim();
  if (!name) return;

  const colorIndex = groups.length % GROUP_COLORS.length;
  groups.push({ id: Date.now(), name, color: GROUP_COLORS[colorIndex] });
  input.value = '';
  document.getElementById('groupInputArea').style.display = 'none';

  renderGroupChips();
  renderGroupSelect();
}

function deleteGroup(id) {
  groups = groups.filter(g => g.id !== id);
  todos.forEach(t => { if (t.groupId === id) t.groupId = null; });
  if (currentGroupFilter === id) currentGroupFilter = null;
  renderGroupChips();
  renderGroupSelect();
  render();
}

function setGroupFilter(id) {
  currentGroupFilter = (currentGroupFilter === id) ? null : id;
  renderGroupChips();
  render();
}

function clearGroupFilter() {
  currentGroupFilter = null;
  renderGroupChips();
  render();
}

function renderGroupChips() {
  const chips = document.getElementById('groupChips');
  let html = '';

  if (groups.length > 0) {
    const allActive = currentGroupFilter === null;
    html += `<button class="chip ${allActive ? 'chip-active' : ''}" onclick="clearGroupFilter()">전체</button>`;

    html += groups.map(g => {
      const isActive = currentGroupFilter === g.id;
      const inlineStyle = isActive
        ? `background:${g.color.bg};color:${g.color.text};border-color:${g.color.text}`
        : '';
      return `
        <button class="chip" style="${inlineStyle}" onclick="setGroupFilter(${g.id})">
          <span class="chip-dot" style="background:${g.color.text}"></span>
          ${escapeHtml(g.name)}
          <button class="chip-delete" onclick="event.stopPropagation();deleteGroup(${g.id})">×</button>
        </button>
      `;
    }).join('');
  }

  html += `<button class="chip chip-add" onclick="toggleGroupInput()">＋</button>`;
  chips.innerHTML = html;
}

function renderGroupSelect() {
  const select = document.getElementById('todoGroup');
  const current = select.value;
  select.innerHTML = '<option value="">📁 그룹 없음</option>' +
    groups.map(g => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');
  if (current) select.value = current;
}

// ── 할 일 관리 ──────────────────────────────

function addTodo() {
  const title = document.getElementById('todoTitle').value.trim();
  if (!title) return;

  const desc = document.getElementById('todoDesc').value.trim();
  const groupVal = document.getElementById('todoGroup').value;
  const groupId = groupVal ? parseInt(groupVal) : null;

  todos.push({ id: Date.now(), title, description: desc, groupId, done: false, completedAt: null });
  closeAddModal();
  renderGroupChips();
  render();
}

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  todo.done = !todo.done;
  todo.completedAt = todo.done ? formatDate(new Date()) : null;
  renderGroupChips();
  render();
}

function toggleSelect(id, checked) {
  if (checked) selectedIds.add(id);
  else selectedIds.delete(id);
  render();
}

function toggleSelectAll(checkbox) {
  const visible = getVisibleTodos();
  if (checkbox.checked) visible.forEach(t => selectedIds.add(t.id));
  else visible.forEach(t => selectedIds.delete(t.id));
  render();
}

function deleteSelected() {
  todos = todos.filter(t => !selectedIds.has(t.id));
  selectedIds.clear();
  renderGroupChips();
  render();
}

function setStatusFilter(filter, btn) {
  currentStatusFilter = filter;
  document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  render();
}

// ── 렌더링 ─────────────────────────────────

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getVisibleTodos() {
  return todos.filter(t => {
    if (currentGroupFilter !== null && t.groupId !== currentGroupFilter) return false;
    if (currentStatusFilter === 'active' && t.done) return false;
    if (currentStatusFilter === 'done' && !t.done) return false;
    return true;
  });
}

function render() {
  const list = document.getElementById('todoList');
  const selectBar = document.getElementById('selectBar');
  const selectAll = document.getElementById('selectAll');

  const total = todos.length;
  const doneCount = todos.filter(t => t.done).length;
  const activeCount = total - doneCount;

  // 탭 배지 업데이트
  const updateBadge = (id, count) => {
    const el = document.getElementById(id);
    el.textContent = count || '';
    el.classList.toggle('visible', count > 0);
  };
  updateBadge('badge-all', total);
  updateBadge('badge-active', activeCount);
  updateBadge('badge-done', doneCount);

  // 선택 삭제 바
  const selCount = selectedIds.size;
  selectBar.style.display = selCount > 0 ? 'flex' : 'none';
  if (selCount > 0) document.getElementById('selectedCount').textContent = `(${selCount}개)`;

  // 전체 선택 체크박스 상태
  const visibleTodos = getVisibleTodos();
  const selVisCount = visibleTodos.filter(t => selectedIds.has(t.id)).length;
  selectAll.checked = visibleTodos.length > 0 && selVisCount === visibleTodos.length;
  selectAll.indeterminate = selVisCount > 0 && selVisCount < visibleTodos.length;

  // 빈 상태
  if (visibleTodos.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📝</span>
        <p class="empty-msg">할 일이 없습니다.</p>
        <p class="empty-hint">＋ 버튼을 눌러 추가해보세요</p>
      </div>
    `;
    return;
  }

  // 목록 렌더링
  list.innerHTML = visibleTodos.map(t => {
    const doneClass = t.done ? 'done' : '';
    const selectedClass = selectedIds.has(t.id) ? 'selected' : '';

    const group = groups.find(g => g.id === t.groupId);
    const groupTag = group
      ? `<span class="group-tag" style="background:${group.color.bg};color:${group.color.text}">${escapeHtml(group.name)}</span>`
      : '';

    const doneBadge = t.done ? `<span class="done-badge">완료</span>` : '';

    const descHtml = t.description
      ? `<span class="todo-desc">${escapeHtml(t.description)}</span>`
      : '';

    const completedHtml = t.done && t.completedAt
      ? `<span class="completed-at">🕐 ${t.completedAt}</span>`
      : '';

    return `
      <div class="todo-item ${doneClass} ${selectedClass}">
        <input class="select-checkbox" type="checkbox" ${selectedIds.has(t.id) ? 'checked' : ''}
          onchange="toggleSelect(${t.id}, this.checked)" />
        <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTodo(${t.id})" />
        <div class="todo-body">
          <span class="todo-title">${escapeHtml(t.title)}</span>
          ${descHtml}
          ${completedHtml}
        </div>
        <div class="todo-tags">
          ${groupTag}
          ${doneBadge}
        </div>
      </div>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('todoTitle').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTodo();
    if (e.key === 'Escape') closeAddModal();
  });
  document.getElementById('todoDesc').addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAddModal();
  });
  document.getElementById('newGroupName').addEventListener('keydown', e => {
    if (e.key === 'Enter') addGroup();
    if (e.key === 'Escape') toggleGroupInput();
  });

  renderGroupChips();
  render();
});
