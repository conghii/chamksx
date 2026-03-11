'use client';

import { useParams } from 'next/navigation';
import { useState, useMemo } from 'react';
import { getTodayTasks, addTaskQuantity, updateTaskStatus, useAPI } from '@/lib/api';
import { TaskAssignment, STAGES } from '@/types';
import { getDayOfWeekVN, formatDateVN, toDateString } from '@/lib/utils';
import { Loader2, Plus, Check, ChevronDown, ChevronUp } from 'lucide-react';

// Production stages for sequential checklist (skip stage 1 "Chờ" — it's the initial state)
const CHECKLIST_STAGES = STAGES.filter(s => s.number >= 2);

export default function TasksPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: tasks, loading, refetch } = useAPI<TaskAssignment[]>(getTodayTasks);

  const [updating, setUpdating] = useState<string | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState<{ taskId: string; stageNumber: number; stageName: string } | null>(null);
  const [activeModal, setActiveModal] = useState<{ task: TaskAssignment } | null>(null);
  const [inputVal, setInputVal] = useState('');
  const [noteVal, setNoteVal] = useState('');
  const [showCompleted, setShowCompleted] = useState(false);

  const today = new Date();

  // Split tasks into active vs completed
  const { activeTasks, completedTasks } = useMemo(() => {
    if (!tasks) return { activeTasks: [], completedTasks: [] };
    const active: TaskAssignment[] = [];
    const done: TaskAssignment[] = [];
    tasks.forEach(t => {
      const isDone = t.status === '5' || t.status === 'completed';
      if (isDone) done.push(t);
      else active.push(t);
    });
    return { activeTasks: active, completedTasks: done };
  }, [tasks]);

  const totalActive = activeTasks.length;
  const totalDone = completedTasks.length;
  const totalAll = totalActive + totalDone;

  // Get the current stage number from task status
  const getCurrentStage = (task: TaskAssignment): number => {
    const n = parseInt(task.status);
    if (!isNaN(n) && n >= 1 && n <= 5) return n;
    if (task.status === 'completed') return 5;
    if (task.status === 'in_progress') return 2;
    return 1; // open or default
  };

  // Handle confirming a step completion
  const handleCompleteStep = async () => {
    if (!confirmStep) return;
    setUpdating(confirmStep.taskId);
    try {
      await updateTaskStatus(confirmStep.taskId, id, String(confirmStep.stageNumber));
      setConfirmStep(null);
      await refetch();
    } catch (err) {
      alert('Lỗi cập nhật: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setUpdating(null);
    }
  };

  // Handle adding quantity
  const handleAddQuantity = async () => {
    if (!activeModal) return;
    const qty = Number(inputVal);
    if (isNaN(qty) || qty <= 0) {
      alert('Vui lòng nhập số lượng hợp lệ lớn hơn 0');
      return;
    }
    setUpdating('modal');
    try {
      await addTaskQuantity(activeModal.task.id, id, qty, noteVal);
      setActiveModal(null);
      await refetch();
    } catch (err) {
      alert('Lỗi: ' + (err instanceof Error ? err.message : 'Unknown'));
    } finally {
      setUpdating(null);
    }
  };

  const openModal = (task: TaskAssignment) => {
    setActiveModal({ task });
    setInputVal('');
    setNoteVal('');
  };

  // Determine edge case message
  const getEdgeCaseMessage = (task: TaskAssignment): { text: string; type: 'qty_ok' | 'steps_ok' } | null => {
    const currentStage = getCurrentStage(task);
    const allStepsDone = currentStage >= 5;
    const qtyDone = task.quantity_done >= task.total_steps && task.total_steps > 0;

    if (qtyDone && !allStepsDone) return { text: 'Đủ số lượng! Hoàn thành các bước còn lại để đóng task.', type: 'qty_ok' };
    if (allStepsDone && !qtyDone && task.total_steps > 0) {
      const remaining = task.total_steps - task.quantity_done;
      return { text: `Đã xong các bước. Cần thêm ${remaining} SP nữa.`, type: 'steps_ok' };
    }
    return null;
  };

  // Parse notes to extract last completion info per stage
  const getStageCompletionInfo = (task: TaskAssignment, stageNumber: number): string | null => {
    if (!task.notes) return null;
    const isGeneral = task.total_steps <= 0;
    if (isGeneral) return null; // General tasks don't have stages

    const stageNames: Record<number, string> = { 2: 'Đang bóc', 3: 'Chia lọ', 4: 'Dán tem', 5: 'Đóng hộp' };
    const stageName = stageNames[stageNumber];
    if (!stageName) return null;
    const lines = task.notes.split('\n');
    const match = lines.find(l => l.includes(stageName));
    if (match) return match.trim();
    return null;
  };

  // Render a single task card
  const renderTaskCard = (task: TaskAssignment, idx: number, isCompletedSection: boolean) => {
    const isGeneral = task.total_steps <= 0;
    const currentStage = getCurrentStage(task);
    const isExpanded = expandedTaskId === task.id;
    const isFullyCompleted = isCompletedSection;
    const progress = !isGeneral && task.total_steps > 0 ? Math.round((task.quantity_done / task.total_steps) * 100) : 0;
    const edgeCase = !isFullyCompleted ? getEdgeCaseMessage(task) : null;
    const stageInfo = STAGES.find(s => s.number === currentStage);

    return (
      <div
        key={`${task.id}-${idx}`}
        className={`card ${isExpanded ? 'card-active' : ''}`}
        style={{
          padding: 0,
          overflow: 'hidden',
          border: isFullyCompleted ? '1.5px solid var(--success)' : undefined,
          background: isFullyCompleted ? 'var(--success-bg)' : undefined,
          opacity: isFullyCompleted ? 0.9 : 1,
        }}
      >
        {/* Collapsed Header — always visible */}
        <div
          onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
          style={{
            padding: '14px 16px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span style={{ fontSize: 20 }}>{isFullyCompleted ? '✅' : '📌'}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {task.description}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
              {task.order_code && (
                <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>{task.order_code}</span>
              )}
              {!isGeneral && (
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-sub)' }}>
                  {task.quantity_done}/{task.total_steps} SP
                </span>
              )}
              {/* Current stage badge */}
              <span style={{
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 6,
                background: isFullyCompleted ? 'var(--success-bg)' : currentStage <= 1 ? 'var(--bg-subtle)' : 'var(--warning-bg)',
                color: isFullyCompleted ? 'var(--success)' : currentStage <= 1 ? 'var(--text-sub)' : 'var(--warning)',
              }}>
                {isFullyCompleted
                  ? '✅ Hoàn thành'
                  : isGeneral 
                    ? '🧹 Việc khác'
                    : `${stageInfo?.icon || '⏳'} ${stageInfo?.name || 'Chờ'} (${currentStage - 1}/4)`
                }
              </span>
            </div>
          </div>
          {isExpanded ? <ChevronUp size={18} color="var(--text-muted)" /> : <ChevronDown size={18} color="var(--text-muted)" />}
        </div>

        {/* Progress bar — only for production tasks */}
        {!isGeneral && (
          <div style={{ height: 6, background: 'var(--border)', margin: '0 16px 0', borderRadius: 3, overflow: 'hidden' }}>
            <div 
              className={isFullyCompleted ? 'glow-success' : 'glow-brand'}
              style={{
                height: '100%',
                width: `${Math.min(progress, 100)}%`,
                background: isFullyCompleted ? 'var(--success)' : 'var(--brand)',
                borderRadius: 3,
                transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              }} 
            />
          </div>
        )}

        {/* Expanded Content */}
        {isExpanded && (
          <div style={{ padding: '12px 16px 16px' }}>
            {/* Stats grid — hide for general tasks */}
            {!isGeneral && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14, marginTop: 8 }}>
                <div style={{ background: 'var(--bg-subtle)', padding: '8px 12px', borderRadius: 8 }}>
                  <span style={{ color: 'var(--text-sub)', fontSize: 12, display: 'block' }}>Tiến độ</span>
                  <span style={{ fontWeight: 600 }}>{progress}%</span>
                </div>
                <div style={{ background: 'var(--bg-subtle)', padding: '8px 12px', borderRadius: 8 }}>
                  <span style={{ color: 'var(--text-sub)', fontSize: 12, display: 'block' }}>Sản phẩm xong</span>
                  <span style={{ fontWeight: 600, color: 'var(--brand)' }}>{task.quantity_done} / {task.total_steps}</span>
                </div>
              </div>
            )}

            {/* Edge case messages */}
            {edgeCase && (
              <div style={{
                padding: '10px 12px',
                borderRadius: 10,
                marginBottom: 12,
                fontSize: 13,
                fontWeight: 500,
                background: edgeCase.type === 'qty_ok' ? 'var(--warning-bg)' : 'var(--bg-subtle)',
                color: edgeCase.type === 'qty_ok' ? 'var(--warning)' : 'var(--brand-dark)',
                border: `1px solid ${edgeCase.type === 'qty_ok' ? 'var(--warning)' : 'var(--brand)'}`,
              }}>
                💡 {edgeCase.text}
              </div>
            )}

            {/* === SEQUENTIAL CHECKLIST — ONLY for production tasks === */}
            {!isGeneral && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', marginBottom: 12 }}>Quy trình sản xuất</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
                  {CHECKLIST_STAGES.map((stage, i) => {
                    const isDone = currentStage > stage.number;
                    const isCurrent = currentStage === stage.number || (currentStage === 1 && stage.number === 2);
                    const isFuture = !isDone && !isCurrent;
                    const completionInfo = isDone ? getStageCompletionInfo(task, stage.number) : null;

                    return (
                      <div key={stage.number} style={{ display: 'flex', gap: 12, position: 'relative' }}>
                        {/* Vertical line */}
                        {i < CHECKLIST_STAGES.length - 1 && (
                          <div style={{
                            position: 'absolute',
                            left: 13,
                            top: 28,
                            bottom: -4,
                            width: 3,
                            borderRadius: 2,
                            background: isDone ? 'var(--success)' : 'var(--border)',
                            opacity: isFuture ? 0.5 : 1,
                            zIndex: 0
                          }} />
                        )}
                        {/* Circle */}
                        <div 
                          className={isCurrent ? 'animate-pulse-slow' : ''}
                          style={{
                            width: 28,
                            height: 28,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 800,
                            flexShrink: 0,
                            zIndex: 1,
                            background: isDone ? 'var(--success)' : isCurrent ? 'var(--brand)' : 'var(--bg-subtle)',
                            color: isDone || isCurrent ? 'white' : 'var(--text-muted)',
                            boxShadow: isCurrent ? '0 0 10px rgba(196,118,78,0.4)' : 'none',
                            border: isFuture ? '2px solid var(--border)' : 'none',
                          }}
                        >
                          {isDone ? '✓' : stage.number - 1}
                        </div>
                        {/* Content */}
                        <div style={{ flex: 1, paddingBottom: i < CHECKLIST_STAGES.length - 1 ? 20 : 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 28 }}>
                            <div style={{ flex: 1 }}>
                              <span style={{
                                fontSize: 14,
                                fontWeight: isCurrent ? 700 : 600,
                                color: isDone ? 'var(--success)' : isCurrent ? 'var(--text-main)' : 'var(--text-muted)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 6
                              }}>
                                <span style={{ fontSize: 16 }}>{stage.icon}</span>
                                {stage.name}
                              </span>
                              {isDone && (
                                <div style={{ fontSize: 11, color: isDone ? 'var(--success)' : 'var(--text-sub)', marginTop: 2, fontWeight: 500 }}>
                                  {completionInfo || 'Đã hoàn thành'}
                                </div>
                              )}
                            </div>
                            {/* Only the CURRENT step gets the action button */}
                            {isCurrent && !isFullyCompleted && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmStep({ taskId: task.id, stageNumber: stage.number, stageName: stage.name });
                                }}
                                disabled={updating === task.id}
                                style={{
                                  padding: '6px 14px',
                                  borderRadius: 10,
                                  border: 'none',
                                  background: 'var(--brand)',
                                  color: 'white',
                                  fontWeight: 700,
                                  fontSize: 12,
                                  cursor: 'pointer',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 4,
                                  fontFamily: 'inherit',
                                  boxShadow: '0 4px 12px rgba(196,118,78,0.2)',
                                  opacity: updating === task.id ? 0.6 : 1,
                                }}
                              >
                                {updating === task.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={14} />}
                                Xong ✓
                              </button>
                            )}
                            {isFuture && (
                              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 500 }}>Chưa tới</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* General Task Completion Button */}
            {isGeneral && !isFullyCompleted && (
              <button
                disabled={updating === task.id}
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmStep({ taskId: task.id, stageNumber: 5, stageName: 'Hoàn thành việc' });
                }}
                style={{
                  width: '100%',
                  padding: '12px 0',
                  borderRadius: 12,
                  border: 'none',
                  background: 'var(--brand)',
                  color: 'white',
                  fontWeight: 700,
                  fontSize: 15,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  cursor: 'pointer',
                  marginBottom: 12,
                  boxShadow: '0 4px 15px rgba(196,118,78,0.3)',
                  opacity: updating === task.id ? 0.7 : 1
                }}
              >
                {updating === task.id ? <Loader2 size={20} className="animate-spin" /> : <Check size={18} />}
                Xác nhận hoàn thành việc
              </button>
            )}

            {/* Report button — hide for general tasks */}
            {!isGeneral && !isFullyCompleted && (edgeCase?.type === 'steps_ok' || !edgeCase || edgeCase.type !== 'qty_ok' || task.quantity_done < task.total_steps) && (
              <button
                onClick={() => openModal(task)}
                style={{
                  width: '100%',
                  padding: '10px 0',
                  borderRadius: 10,
                  border: 'none',
                  background: 'var(--brand)',
                  color: 'white',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                <Plus size={16} /> Báo Cáo Thêm SP
              </button>
            )}

            {/* Completed info */}
            {isFullyCompleted && (
              <div style={{ padding: '10px', background: 'var(--success-bg)', borderRadius: 10, textAlign: 'center', fontSize: 13, color: 'var(--success)', fontWeight: 600 }}>
                ✅ Đã hoàn thành {task.completed_by ? `bởi ${task.completed_by}` : ''} {task.completed_at ? `lúc ${task.completed_at}` : ''}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>📋 Việc chung hôm nay</h1>
        <p style={{ color: 'var(--text-sub)', fontSize: 14, margin: '4px 0 0' }}>{getDayOfWeekVN(today)}, {formatDateVN(today)}</p>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>Mọi người cùng làm, cập nhật tiến độ của mình vào đây.</p>
        {totalAll > 0 && (
          <span className="badge" style={{ background: 'var(--brand-light)', color: 'var(--brand)', marginTop: 8, display: 'inline-flex' }}>
            {totalAll} Việc chung
          </span>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}
        </div>
      )}

      {/* No tasks */}
      {!loading && totalAll === 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>☕</div>
          <p style={{ fontWeight: 600, fontSize: 16, margin: '0 0 4px' }}>Hôm nay không có Việc Chung</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, margin: 0 }}>Lịch làm việc có thể trống hoặc chưa được phân bổ</p>
        </div>
      )}

      {/* ========== ACTIVE TASKS SECTION ========== */}
      {!loading && totalActive > 0 && (
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            📌 Đang làm
            <span style={{ fontSize: 12, fontWeight: 600, background: 'var(--warning-bg)', color: 'var(--warning)', padding: '2px 8px', borderRadius: 6 }}>
              {totalActive} việc
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {activeTasks.map((task, idx) => renderTaskCard(task, idx, false))}
          </div>
        </div>
      )}

      {/* ========== COMPLETED TASKS SECTION ========== */}
      {!loading && totalDone > 0 && (
        <div>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
            style={{
              fontSize: 14, fontWeight: 700, color: 'var(--success)', marginBottom: 8,
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: 'inherit',
            }}
          >
            ✅ Đã hoàn thành
            <span style={{ fontSize: 12, fontWeight: 600, background: 'var(--success-bg)', color: 'var(--success)', padding: '2px 8px', borderRadius: 6 }}>
              {totalDone} việc
            </span>
            {showCompleted ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {showCompleted && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {completedTasks.map((task, idx) => renderTaskCard(task, idx, true))}
            </div>
          )}
        </div>
      )}

      {/* Progress Footer */}
      {totalAll > 0 && (
        <div className="card" style={{ textAlign: 'center', padding: 16, marginTop: 8 }}>
          <p style={{ fontSize: 14, fontWeight: 600, margin: '0 0 8px' }}>
            Toàn đội đã xong {totalDone}/{totalAll} việc hôm nay
          </p>
          <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${totalAll > 0 ? (totalDone/totalAll*100) : 0}%`, background: 'var(--brand)', borderRadius: 4, transition: 'width 0.3s' }} />
          </div>
        </div>
      )}

      {/* ========== CONFIRM DIALOG ========== */}
      {confirmStep && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: 'white', borderRadius: 20, padding: 24, width: '100%', maxWidth: 340, textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 8 }}>{STAGES.find(s => s.number === confirmStep.stageNumber)?.icon || '✅'}</div>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Hoàn thành bước {confirmStep.stageNumber - 1}?</h3>
            <p style={{ fontSize: 14, color: 'var(--text-sub)', margin: '0 0 20px' }}>
              Xác nhận đã xong <strong>{confirmStep.stageName}</strong>
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setConfirmStep(null)}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: '1px solid var(--border)', background: 'white', color: 'var(--text-sub)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Hủy
              </button>
              <button
                onClick={handleCompleteStep}
                disabled={updating === confirmStep.taskId}
                style={{ flex: 1, padding: 12, borderRadius: 12, border: 'none', background: 'var(--brand)', color: 'white', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', opacity: updating === confirmStep.taskId ? 0.7 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                {updating === confirmStep.taskId ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========== ADD QUANTITY MODAL ========== */}
      {activeModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div className="glass-card" style={{ background: 'white', width: '100%', maxWidth: 480, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: '24px 20px 32px', animation: 'slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)', boxShadow: '0 -8px 30px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <h3 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: 'var(--text-main)' }}>Cộng Sản Phẩm Xong</h3>
              <button onClick={() => setActiveModal(null)} style={{ background: 'var(--bg-subtle)', border: 'none', width: 32, height: 32, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-muted)' }}>&times;</button>
            </div>
            <p style={{ color: 'var(--text-sub)', fontSize: 14, marginBottom: 20, fontWeight: 500 }}>{activeModal.task.description}</p>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text-main)' }}>Số lượng làm thêm được</label>
              <input
                type="number"
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                placeholder="Ví dụ: 100"
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 16, outline: 'none' }}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8, color: 'var(--text-main)' }}>Ghi chú (nếu có)</label>
              <input
                type="text"
                value={noteVal}
                onChange={e => setNoteVal(e.target.value)}
                placeholder="VD: Thiếu vật tư, cần chờ thêm..."
                style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid var(--border)', fontSize: 16, outline: 'none' }}
              />
            </div>
            <button
              onClick={handleAddQuantity}
              disabled={updating === 'modal'}
              style={{ width: '100%', padding: 14, borderRadius: 12, border: 'none', background: 'var(--brand)', color: 'white', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, opacity: updating === 'modal' ? 0.7 : 1, fontFamily: 'inherit' }}
            >
              {updating === 'modal' ? <Loader2 size={20} className="animate-spin" /> : <Check size={20} />} Lưu Cập Nhật
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
