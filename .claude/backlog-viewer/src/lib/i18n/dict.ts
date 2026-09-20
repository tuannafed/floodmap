// UI-chrome translations for the Backlog Viewer. Deliberately separate from
// `lib/status-map.generated.ts` (generated from templates/task-status-registry.json) —
// that file stays the single canonical English source consumed by bash/python/TS across
// the whole caw ecosystem. STATUS_LABELS_VI/STAGE_LABELS_VI below are a display-only
// lookup keyed by the same canonical status/stage keys, never the other way around.
export type Lang = 'en' | 'vi';

export interface Dict {
  sidebar: {
    navGroup: string;
    nav: { dashboard: string; board: string; skills: string; docs: string };
    systemStatus: string;
    metrics: { agents: string; tasks: string; skills: string; commands: string; rules: string };
    projectFallback: string;
    operator: string;
    online: string;
  };
  stats: {
    totalTasks: string;
    complete: (pct: number) => string;
    inProgress: string;
    pendingCount: (n: number) => string;
    done: string;
    completed: string;
    blocked: string;
    needsAttention: string;
    allClear: string;
  };
  health: {
    title: string;
    skillsCount: (n: number) => string;
    loading: string;
    domainsLabel: (covered: number, total: number) => string;
    noSkills: string;
    topDomain: string;
    domainsMissing: (n: number) => string;
    fullCoverage: string;
  };
  projectInfo: {
    title: string;
    subtitle: string;
    tabs: {
      overview: { label: string; description: string };
      knowledge: { label: string; description: string };
      claude: { label: string; description: string };
      rules: { label: string; description: string };
    };
    notFoundSuffix: string;
    emptyFile: string;
    couldNotLoad: string;
    rulesView: {
      project: { label: string; blurb: string };
      commit: { label: string; blurb: string };
      harness: { label: string; blurb: string };
      badgeProject: string;
      badgeCaw: string;
      noneFound: string;
      fileEmpty: string;
      fileNotFound: string;
    };
  };
  overview: {
    couldNotLoad: string;
    meta: { team: string; archetype: string; generated: string; lastUpdated: string };
    stackSummary: string;
    conventions: string;
  };
  activity: {
    title: string;
    seeAll: string;
    none: string;
    stageBadge: {
      done: string;
      coding: string;
      blocked: string;
      testing: string;
      review: string;
      planning: string;
      pending: string;
    };
    desc: {
      completed: string;
      testsCompleted: string;
      reviewApproved: string;
      implementationStarted: string;
      planCreated: string;
      markedBlocked: string;
      updatedTo: (label: string) => string;
    };
  };
  docs: {
    notConfiguredTitle: string;
    noHtmlFound: string;
    selectPrompt: string;
  };
  skills: {
    noDescription: string;
    searchPlaceholder: string;
    sortName: string;
    sortDomain: string;
    installedSuffix: string;
    domainsCoveredSuffix: string;
    noneInstalled: string;
    noMatch: string;
    failedToLoad: (error: string) => string;
    detailFallback: string;
    domainPrefix: (label: string) => string;
  };
  taskCard: {
    phase: (n: number) => string;
    left: (n: number) => string;
  };
  taskColumn: {
    noTasks: string;
    empty: {
      pending: string;
      planning: string;
      coding: string;
      testing: string;
      review: string;
      blocked: string;
      done: string;
    };
  };
  taskDialog: {
    meta: {
      status: string;
      lane: string;
      type: string;
      nextPhase: string;
      phases: string;
      created: string;
      updated: string;
      progress: string;
    };
    noPhases: string;
    noPhasesDefined: string;
    tabs: { overview: string; plan: string; code: string; tests: string; review: string };
    table: { phase: string; status: string; dependsOn: string; files: string };
    none: string;
    doneOfTotal: (done: number, total: number) => string;
    relations: { parallelGroups: string; related: string; chainsAfter: string };
    notWritten: string;
    lanePrefix: (lane: string) => string;
    nextPrefix: (next: string) => string;
    detailDescription: (id: string, title: string) => string;
  };
  tasksBoard: {
    noTasksYet: string;
    createWith: string;
  };
  tasksList: {
    columns: { task: string; progress: string; lane: string; type: string; updated: string };
    noTasksYet: string;
    createWith: string;
    noResults: string;
    tryDifferent: string;
  };
  boardView: {
    tasksSuffix: string;
    inProgressSuffix: string;
    doneSuffix: string;
    blockedSuffix: string;
    searchPlaceholder: string;
    sortStatus: string;
    sortUpdated: string;
    sortLane: string;
  };
  theme: {
    switchToLight: string;
    switchToDark: string;
  };
  lang: {
    switchTo: string;
  };
  markdownTools: {
    preview: string;
    raw: string;
    export: string;
    exportMarkdown: string;
    exportHtml: string;
    exportExcel: string;
    noTables: string;
    exportFailed: string;
  };
}

export const en: Dict = {
  sidebar: {
    navGroup: 'Navigation',
    nav: { dashboard: 'Dashboard', board: 'Board', skills: 'Skills', docs: 'Docs' },
    systemStatus: 'System Status',
    metrics: {
      agents: 'Agents',
      tasks: 'Tasks',
      skills: 'Skills',
      commands: 'Commands',
      rules: 'Rules',
    },
    projectFallback: 'Project',
    operator: 'Operator',
    online: 'Online',
  },
  stats: {
    totalTasks: 'Total Tasks',
    complete: (pct) => `${pct}% complete`,
    inProgress: 'In Progress',
    pendingCount: (n) => `${n} pending`,
    done: 'Done',
    completed: 'Completed',
    blocked: 'Blocked',
    needsAttention: 'Needs attention',
    allClear: 'All clear',
  },
  health: {
    title: 'Skill Coverage',
    skillsCount: (n) => `${n} skills`,
    loading: 'Loading…',
    domainsLabel: (covered, total) => `${covered}/${total} domains`,
    noSkills: 'No skills installed.',
    topDomain: 'Top domain:',
    domainsMissing: (n) => `${n} domain${n > 1 ? 's' : ''} missing`,
    fullCoverage: 'Full coverage',
  },
  projectInfo: {
    title: 'Project Info',
    subtitle: 'Source-of-truth files driving agent behavior in this project.',
    tabs: {
      overview: {
        label: 'Overview',
        description: 'Project identity, tech stack, and metadata at a glance.',
      },
      knowledge: {
        label: 'Knowledge',
        description:
          'Project memory: domain glossary, gotchas, external-integration quirks, and lessons learned. Agents append here after a task surfaces something non-obvious so the next agent doesn’t re-learn it.',
      },
      claude: {
        label: 'CLAUDE.md',
        description: 'Top-level project context shared with every Claude session.',
      },
      rules: {
        label: 'Rules',
        description:
          'Non-overridable rules every agent must respect. project.md is generated by /caw-setup; the other two ship with caw.',
      },
    },
    notFoundSuffix: 'not found in project.',
    emptyFile: 'File exists but is empty.',
    couldNotLoad: 'Could not load project files.',
    rulesView: {
      project: {
        label: 'Project rules',
        blurb:
          'Stack lock-ins, forbidden patterns, and domain rules specific to this project. Generated by /caw-setup.',
      },
      commit: {
        label: 'Commit conventions',
        blurb: 'How commits and PRs are formatted across this repo.',
      },
      harness: {
        label: 'Harness contract',
        blurb: 'Triggers and protocol for when agents emit decisions, ADRs, and reviews.',
      },
      badgeProject: 'project',
      badgeCaw: 'caw',
      noneFound: 'No rules found in .claude/rules/.',
      fileEmpty: 'File exists but is empty.',
      fileNotFound: 'File not found in project.',
    },
  },
  overview: {
    couldNotLoad: 'Could not load project overview.',
    meta: {
      team: 'Team',
      archetype: 'Archetype',
      generated: 'Generated',
      lastUpdated: 'Last Updated',
    },
    stackSummary: 'Stack Summary',
    conventions: 'Conventions',
  },
  activity: {
    title: 'Activity Feed',
    seeAll: 'See all',
    none: 'No activity yet.',
    stageBadge: {
      done: 'Done',
      coding: 'In progress',
      blocked: 'Risky',
      testing: 'Testing',
      review: 'Review',
      planning: 'Planning',
      pending: 'Planned',
    },
    desc: {
      completed: 'completed',
      testsCompleted: 'tests completed',
      reviewApproved: 'code review approved',
      implementationStarted: 'implementation started',
      planCreated: 'plan created',
      markedBlocked: 'marked as blocked',
      updatedTo: (label) => `updated to ${label.toLowerCase()}`,
    },
  },
  docs: {
    notConfiguredTitle: 'No doc folders configured',
    noHtmlFound: 'No HTML docs found yet under the configured folders.',
    selectPrompt: 'Select a document from the sidebar to preview',
  },
  skills: {
    noDescription: 'No description.',
    searchPlaceholder: 'Search skills, descriptions, tags…',
    sortName: 'Name',
    sortDomain: 'Domain',
    installedSuffix: 'skills installed',
    domainsCoveredSuffix: 'domains covered',
    noneInstalled: 'No skills installed. Run /caw-setup to add some.',
    noMatch: 'No skills match your search.',
    failedToLoad: (error) => `Failed to load: ${error}`,
    detailFallback: 'Skill detail',
    domainPrefix: (label) => `domain: ${label}`,
  },
  taskCard: {
    phase: (n) => `${n} ${n === 1 ? 'phase' : 'phases'}`,
    left: (n) => `${n} left`,
  },
  taskColumn: {
    noTasks: 'No tasks',
    empty: {
      pending: 'Standby for incoming assignments',
      planning: 'Planning queue is clear',
      coding: 'Nothing in development',
      testing: 'No tests running',
      review: 'Review queue is empty',
      blocked: 'Nothing blocked',
      done: 'No completed tasks yet',
    },
  },
  taskDialog: {
    meta: {
      status: 'Status',
      lane: 'Lane',
      type: 'Type',
      nextPhase: 'Next Phase',
      phases: 'Phases',
      created: 'Created',
      updated: 'Updated',
      progress: 'Progress',
    },
    noPhases: 'No phases',
    noPhasesDefined: 'No phases defined.',
    tabs: { overview: 'Overview', plan: 'Plan', code: 'Code', tests: 'Tests', review: 'Review' },
    table: { phase: 'Phase', status: 'Status', dependsOn: 'Depends on', files: 'Files' },
    none: 'none',
    doneOfTotal: (done, total) => `${done} done / ${total} total`,
    relations: {
      parallelGroups: 'Parallelization groups:',
      related: 'Related tasks:',
      chainsAfter: 'Chains after:',
    },
    notWritten: 'Not yet written.',
    lanePrefix: (lane) => `Lane · ${lane}`,
    nextPrefix: (next) => `next · ${next}`,
    detailDescription: (id, title) => `Task detail for ${id}: ${title}`,
  },
  tasksBoard: {
    noTasksYet: 'No tasks yet.',
    createWith: 'Create one with /caw-plan.',
  },
  tasksList: {
    columns: { task: 'Task', progress: 'Progress', lane: 'Lane', type: 'Type', updated: 'Updated' },
    noTasksYet: 'No tasks yet',
    createWith: 'Create one with /caw-plan',
    noResults: 'No results',
    tryDifferent: 'Try a different search term',
  },
  boardView: {
    tasksSuffix: 'tasks',
    inProgressSuffix: 'in progress',
    doneSuffix: 'done',
    blockedSuffix: 'blocked',
    searchPlaceholder: 'Search tasks…',
    sortStatus: 'Status',
    sortUpdated: 'Updated',
    sortLane: 'Lane',
  },
  theme: {
    switchToLight: 'Switch to light mode',
    switchToDark: 'Switch to dark mode',
  },
  lang: {
    switchTo: 'Chuyển sang Tiếng Việt',
  },
  markdownTools: {
    preview: 'Preview',
    raw: 'Raw',
    export: 'Export',
    exportMarkdown: 'Markdown (.md)',
    exportHtml: 'HTML (.html)',
    exportExcel: 'Excel (.xlsx)',
    noTables: 'No tables found in this document',
    exportFailed: 'Export failed',
  },
};

export const vi: Dict = {
  sidebar: {
    navGroup: 'Điều hướng',
    nav: { dashboard: 'Tổng quan', board: 'Bảng', skills: 'Kỹ năng', docs: 'Tài liệu' },
    systemStatus: 'Trạng thái hệ thống',
    metrics: {
      agents: 'Agent',
      tasks: 'Task',
      skills: 'Kỹ năng',
      commands: 'Lệnh',
      rules: 'Quy tắc',
    },
    projectFallback: 'Project',
    operator: 'Người vận hành',
    online: 'Trực tuyến',
  },
  stats: {
    totalTasks: 'Tổng số Task',
    complete: (pct) => `Hoàn thành ${pct}%`,
    inProgress: 'Đang thực hiện',
    pendingCount: (n) => `${n} đang chờ`,
    done: 'Hoàn thành',
    completed: 'Đã hoàn thành',
    blocked: 'Bị chặn',
    needsAttention: 'Cần xử lý',
    allClear: 'Ổn định',
  },
  health: {
    title: 'Độ phủ Kỹ năng',
    skillsCount: (n) => `${n} kỹ năng`,
    loading: 'Đang tải…',
    domainsLabel: (covered, total) => `${covered}/${total} nhóm`,
    noSkills: 'Chưa cài kỹ năng nào.',
    topDomain: 'Nhóm nhiều nhất:',
    domainsMissing: (n) => `Thiếu ${n} nhóm`,
    fullCoverage: 'Đã phủ đầy đủ',
  },
  projectInfo: {
    title: 'Thông tin Project',
    subtitle: 'Các file nguồn quyết định hành vi của agent trong project này.',
    tabs: {
      overview: {
        label: 'Tổng quan',
        description:
          'Thông tin định danh project, tech stack và metadata, xem nhanh trong 1 màn hình.',
      },
      knowledge: {
        label: 'Kiến thức',
        description:
          'Bộ nhớ của project: thuật ngữ chuyên ngành, các lỗi/vướng mắc thường gặp, đặc thù khi tích hợp bên ngoài, và bài học rút ra. Agent ghi thêm vào đây sau khi một task phát hiện điều gì đó không hiển nhiên, để agent sau không phải học lại từ đầu.',
      },
      claude: {
        label: 'CLAUDE.md',
        description: 'Ngữ cảnh cấp cao của project, dùng chung cho mọi session Claude.',
      },
      rules: {
        label: 'Quy tắc',
        description:
          'Các quy tắc bắt buộc mọi agent phải tuân theo, không được ghi đè. project.md được sinh ra bởi /caw-setup; 2 file còn lại đi kèm sẵn trong caw.',
      },
    },
    notFoundSuffix: 'không tìm thấy trong project.',
    emptyFile: 'File tồn tại nhưng đang rỗng.',
    couldNotLoad: 'Không tải được các file của project.',
    rulesView: {
      project: {
        label: 'Quy tắc project',
        blurb:
          'Các lock-in về stack, pattern bị cấm, và quy tắc riêng theo domain của project này. Được sinh ra bởi /caw-setup.',
      },
      commit: {
        label: 'Quy ước commit',
        blurb: 'Cách format commit và PR trong toàn bộ repo này.',
      },
      harness: {
        label: 'Harness contract',
        blurb: 'Các điều kiện kích hoạt và giao thức khi agent tạo decision, ADR, và review.',
      },
      badgeProject: 'project',
      badgeCaw: 'caw',
      noneFound: 'Không tìm thấy rule nào trong .claude/rules/.',
      fileEmpty: 'File tồn tại nhưng đang rỗng.',
      fileNotFound: 'Không tìm thấy file trong project.',
    },
  },
  overview: {
    couldNotLoad: 'Không tải được tổng quan project.',
    meta: {
      team: 'Team',
      archetype: 'Archetype',
      generated: 'Ngày tạo',
      lastUpdated: 'Cập nhật gần nhất',
    },
    stackSummary: 'Tổng hợp Stack',
    conventions: 'Conventions',
  },
  activity: {
    title: 'Hoạt động gần đây',
    seeAll: 'Xem tất cả',
    none: 'Chưa có hoạt động nào.',
    stageBadge: {
      done: 'Hoàn thành',
      coding: 'Đang làm',
      blocked: 'Rủi ro',
      testing: 'Đang test',
      review: 'Đang review',
      planning: 'Đang lên plan',
      pending: 'Đã lên plan',
    },
    desc: {
      completed: 'đã hoàn thành',
      testsCompleted: 'đã test xong',
      reviewApproved: 'code review đã được duyệt',
      implementationStarted: 'bắt đầu code',
      planCreated: 'đã tạo plan',
      markedBlocked: 'bị đánh dấu chặn',
      updatedTo: (label) => `cập nhật sang ${label.toLowerCase()}`,
    },
  },
  docs: {
    notConfiguredTitle: 'Chưa cấu hình thư mục tài liệu',
    noHtmlFound: 'Chưa tìm thấy tài liệu HTML nào trong các thư mục đã cấu hình.',
    selectPrompt: 'Chọn một tài liệu ở sidebar để xem trước',
  },
  skills: {
    noDescription: 'Chưa có mô tả.',
    searchPlaceholder: 'Tìm kỹ năng, mô tả, tag…',
    sortName: 'Tên',
    sortDomain: 'Nhóm',
    installedSuffix: 'kỹ năng đã cài',
    domainsCoveredSuffix: 'nhóm đã có',
    noneInstalled: 'Chưa cài kỹ năng nào. Chạy /caw-setup để thêm.',
    noMatch: 'Không có kỹ năng khớp với tìm kiếm.',
    failedToLoad: (error) => `Tải thất bại: ${error}`,
    detailFallback: 'Chi tiết kỹ năng',
    domainPrefix: (label) => `nhóm: ${label}`,
  },
  taskCard: {
    phase: (n) => `${n} giai đoạn`,
    left: (n) => `còn ${n}`,
  },
  taskColumn: {
    noTasks: 'Không có task',
    empty: {
      pending: 'Đang chờ task mới',
      planning: 'Không có task nào đang lên plan',
      coding: 'Không có task nào đang code',
      testing: 'Không có test nào đang chạy',
      review: 'Không có task nào đang review',
      blocked: 'Không có task nào bị chặn',
      done: 'Chưa có task hoàn thành',
    },
  },
  taskDialog: {
    meta: {
      status: 'Trạng thái',
      lane: 'Lane',
      type: 'Loại',
      nextPhase: 'Giai đoạn tiếp theo',
      phases: 'Giai đoạn',
      created: 'Tạo lúc',
      updated: 'Cập nhật lúc',
      progress: 'Tiến độ',
    },
    noPhases: 'Không có giai đoạn',
    noPhasesDefined: 'Chưa định nghĩa giai đoạn nào.',
    tabs: { overview: 'Tổng quan', plan: 'Plan', code: 'Code', tests: 'Test', review: 'Review' },
    table: { phase: 'Giai đoạn', status: 'Trạng thái', dependsOn: 'Phụ thuộc', files: 'File' },
    none: 'không có',
    doneOfTotal: (done, total) => `${done}/${total} đã xong`,
    relations: {
      parallelGroups: 'Nhóm chạy song song:',
      related: 'Task liên quan:',
      chainsAfter: 'Nối tiếp sau:',
    },
    notWritten: 'Chưa có nội dung.',
    lanePrefix: (lane) => `Lane · ${lane}`,
    nextPrefix: (next) => `tiếp theo · ${next}`,
    detailDescription: (id, title) => `Chi tiết task ${id}: ${title}`,
  },
  tasksBoard: {
    noTasksYet: 'Chưa có task nào.',
    createWith: 'Tạo task mới với /caw-plan.',
  },
  tasksList: {
    columns: { task: 'Task', progress: 'Tiến độ', lane: 'Lane', type: 'Loại', updated: 'Cập nhật' },
    noTasksYet: 'Chưa có task nào',
    createWith: 'Tạo task mới với /caw-plan',
    noResults: 'Không có kết quả',
    tryDifferent: 'Thử từ khóa tìm kiếm khác',
  },
  boardView: {
    tasksSuffix: 'task',
    inProgressSuffix: 'đang làm',
    doneSuffix: 'hoàn thành',
    blockedSuffix: 'bị chặn',
    searchPlaceholder: 'Tìm task…',
    sortStatus: 'Trạng thái',
    sortUpdated: 'Cập nhật',
    sortLane: 'Lane',
  },
  theme: {
    switchToLight: 'Chuyển sang chế độ sáng',
    switchToDark: 'Chuyển sang chế độ tối',
  },
  lang: {
    switchTo: 'Switch to English',
  },
  markdownTools: {
    preview: 'Xem trước',
    raw: 'Mã nguồn',
    export: 'Xuất',
    exportMarkdown: 'Markdown (.md)',
    exportHtml: 'HTML (.html)',
    exportExcel: 'Excel (.xlsx)',
    noTables: 'Tài liệu này không có bảng nào',
    exportFailed: 'Xuất thất bại',
  },
};

// Keyed by the registry's canonical status/stage names (templates/task-status-registry.json),
// never by the English label text — so a future rewording of STATUS_LABELS in the hub
// doesn't silently break the VI lookup.
export const STATUS_LABELS_VI: Record<string, string> = {
  pending: 'Chờ xử lý',
  'plan-pending': 'Chờ lên plan',
  planning: 'Đang lên plan',
  'plan-done': 'Plan đã xong',
  planned: 'Plan đã xong',
  coding: 'Đang code',
  'code-pending': 'Chờ code',
  'code-done': 'Code đã xong',
  'in-progress': 'Đang thực hiện',
  in_progress: 'Đang thực hiện',
  testing: 'Đang test',
  'red-done': 'Test đỏ (fail)',
  'tests-done': 'Test đã pass',
  'tests-skipped': 'Bỏ qua test',
  reviewing: 'Đang review',
  'review-pending': 'Chờ review',
  'ready-to-review': 'Sẵn sàng review',
  'review-blocked': 'Review bị chặn',
  'needs-rework': 'Cần sửa lại',
  blocked: 'Bị chặn',
  'review-done': 'Đã review',
  'verify-done': 'Đã review',
  verified: 'Đã verify',
  'review-approved': 'Review đã duyệt',
  approved: 'Đã duyệt',
  'ready-to-commit': 'Sẵn sàng commit',
  done: 'Hoàn thành',
  completed: 'Đã hoàn tất',
  closed: 'Đã đóng',
  deferred: 'Đã hoãn',
};

// Keyed by lib/skill-domain.ts's DomainStyle.key (engineering/quality/product/workflow/security/devops).
export const DOMAIN_LABELS_VI: Record<string, string> = {
  engineering: 'Kỹ thuật',
  quality: 'Chất lượng',
  product: 'Sản phẩm',
  workflow: 'Quy trình',
  security: 'An ninh',
  devops: 'DevOps',
};

export const STAGE_LABELS_VI: Record<string, string> = {
  pending: 'Chờ xử lý',
  planning: 'Lên kế hoạch',
  coding: 'Đang code',
  testing: 'Đang test',
  review: 'Đang review',
  blocked: 'Bị chặn',
  done: 'Hoàn thành',
  unknown: 'Không xác định',
};

export const DICTS: Record<Lang, Dict> = { en, vi };
