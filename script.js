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

const STATUS_LABELS = {
  all: '전체 할 일',
  active: '진행 중인 할 일',
  done: '완료된 할 일',
};

// ── 그룹 관리 ──────────────────────────────

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

  renderGroups();
  renderGroupSelect();
}

function deleteGroup(id) {
  groups = groups.filter(g => g.id !== id);
  todos.forEach(t => { if (t.groupId === id) t.groupId = null; });
  if (currentGroupFilter === id) currentGroupFilter = null;
  renderGroups();
  renderGroupSelect();
  render();
}

function setGroupFilter(id) {
  currentGroupFilter = (currentGroupFilter === id) ? null : id;
  renderGroups();
  render();
}

function clearGroupFilter() {
  currentGroupFilter = null;
  renderGroups();
  render();
}

function renderGroups() {
  const list = document.getElementById('groupList');

  if (groups.length === 0) {
    list.innerHTML = '<p class="group-empty-msg">그룹이 없습니다.<br/>+ 버튼으로 추가하세요.</p>';
    return;
  }

  const allActive = currentGroupFilter === null;
  const allBtn = `
    <button class="group-item ${allActive ? 'active' : ''}" onclick="clearGroupFilter()">
      <span class="group-dot" style="background:#9ca3af"></span>
      <span class="group-item-name">전체 그룹</span>
      <span class="group-item-count">${todos.length}</span>
    </button>
  `;

  const groupBtns = groups.map(g => {
    const count = todos.filter(t => t.groupId === g.id).length;
    const isActive = currentGroupFilter === g.id;
    return `
      <button class="group-item ${isActive ? 'active' : ''}" onclick="setGroupFilter(${g.id})">
        <span class="group-dot" style="background:${g.color.text}"></span>
        <span class="group-item-name">${escapeHtml(g.name)}</span>
        <span class="group-item-count">${count}</span>
        <button class="group-delete-btn" onclick="event.stopPropagation(); deleteGroup(${g.id})" title="그룹 삭제">✕</button>
      </button>
    `;
  }).join('');

  list.innerHTML = allBtn + groupBtns;
}

function renderGroupSelect() {
  const select = document.getElementById('todoGroup');
  const current = select.value;
  select.innerHTML = '<option value="">📁 그룹 없음</option>' +
    groups.map(g => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');
  if (current) select.value = current;
}

// ── 입력 폼 ────────────────────────────────

function expandForm() {
  document.getElementById('inputExpand').style.display = 'flex';
}

function collapseForm() {
  document.getElementById('inputExpand').style.display = 'none';
  document.getElementById('todoTitle').value = '';
  document.getElementById('todoDesc').value = '';
  document.getElementById('todoGroup').value = '';
}

function addTodo() {
  const title = document.getElementById('todoTitle').value.trim();
  if (!title) return;

  const desc = document.getElementById('todoDesc').value.trim();
  const groupVal = document.getElementById('todoGroup').value;
  const groupId = groupVal ? parseInt(groupVal) : null;

  todos.push({ id: Date.now(), title, description: desc, groupId, done: false, completedAt: null });
  collapseForm();
  renderGroups();
  render();
}

// ── 할 일 관리 ──────────────────────────────

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
  renderGroups();
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
  renderGroups();
  render();
}

function setStatusFilter(filter, btn) {
  currentStatusFilter = filter;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
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
    return true;
  });
}

function isStatusMatch(todo) {
  if (currentStatusFilter === 'active') return !todo.done;
  if (currentStatusFilter === 'done') return todo.done;
  return true;
}

function render() {
  const list = document.getElementById('todoList');
  const summary = document.getElementById('summary');
  const contentTitle = document.getElementById('contentTitle');
  const deleteBtn = document.getElementById('deleteSelectedBtn');
  const selectedCountEl = document.getElementById('selectedCount');
  const selectAllCheckbox = document.getElementById('selectAll');

  const total = todos.length;
  const doneCount = todos.filter(t => t.done).length;
  const activeCount = total - doneCount;

  // 헤더 뱃지
  document.getElementById('badge-all').textContent = total;
  document.getElementById('badge-active').textContent = activeCount;
  document.getElementById('badge-done').textContent = doneCount;

  // 목록 타이틀
  if (currentGroupFilter !== null) {
    const group = groups.find(g => g.id === currentGroupFilter);
    contentTitle.textContent = group
      ? `${group.name} · ${STATUS_LABELS[currentStatusFilter]}`
      : STATUS_LABELS[currentStatusFilter];
  } else {
    contentTitle.textContent = STATUS_LABELS[currentStatusFilter];
  }

  // 요약 (현재 그룹 필터 기준)
  const visibleTodos = getVisibleTodos();
  const visibleDone = visibleTodos.filter(t => t.done).length;
  const visibleActive = visibleTodos.length - visibleDone;
  summary.textContent = visibleTodos.length > 0
    ? `전체 ${visibleTodos.length}개 · 진행 중 ${visibleActive}개 · 완료 ${visibleDone}개`
    : '';

  // 선택 삭제 버튼
  const selCount = selectedIds.size;
  deleteBtn.style.display = selCount > 0 ? 'inline-block' : 'none';
  if (selCount > 0) selectedCountEl.textContent = `(${selCount}개)`;

  // 전체 선택 체크박스
  const visCount = visibleTodos.length;
  const selVisCount = visibleTodos.filter(t => selectedIds.has(t.id)).length;
  selectAllCheckbox.checked = visCount > 0 && selVisCount === visCount;
  selectAllCheckbox.indeterminate = selVisCount > 0 && selVisCount < visCount;

  // 목록 렌더링
  if (visibleTodos.length === 0) {
    list.innerHTML = '<div class="empty-msg">할 일을 추가해보세요!</div>';
    return;
  }

  list.innerHTML = visibleTodos.map(t => {
    const dimmed = !isStatusMatch(t) ? 'dimmed' : '';
    const doneClass = t.done ? 'done' : '';
    const selectedClass = selectedIds.has(t.id) ? 'selected' : '';
    const statusLabel = t.done ? '완료' : '진행 중';

    const group = groups.find(g => g.id === t.groupId);
    const groupTag = group
      ? `<span class="group-tag" style="background:${group.color.bg};color:${group.color.text}">${escapeHtml(group.name)}</span>`
      : '';

    const descHtml = t.description
      ? `<span class="todo-desc">${escapeHtml(t.description)}</span>`
      : '';

    const completedHtml = t.done && t.completedAt
      ? `<span class="completed-at">🕐 ${t.completedAt}</span>`
      : '';

    return `
      <div class="todo-item ${doneClass} ${dimmed} ${selectedClass}">
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
          <span class="status-tag">${statusLabel}</span>
        </div>
      </div>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('todoTitle').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTodo();
    if (e.key === 'Escape') collapseForm();
  });
  document.getElementById('todoDesc').addEventListener('keydown', e => {
    if (e.key === 'Escape') collapseForm();
  });
  document.getElementById('newGroupName').addEventListener('keydown', e => {
    if (e.key === 'Enter') addGroup();
    if (e.key === 'Escape') toggleGroupInput();
  });
  renderGroups();
  render();
});
