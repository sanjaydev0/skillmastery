#!/bin/bash
# Comprehensive verification of all plan requirements

echo "=== COMPREHENSIVE PLAN REQUIREMENTS VERIFICATION ==="
echo ""

# Track pass/fail
PASS=0
FAIL=0

check_feature() {
    local name="$1"
    local file="$2"
    local pattern="$3"
    
    if grep -q "$pattern" "$file" 2>/dev/null; then
        echo "✅ $name"
        ((PASS++))
    else
        echo "❌ $name - NOT FOUND"
        ((FAIL++))
    fi
}

echo "Phase C: Day 0 & Controls"
check_feature "Day 0: 9-item checklist" "src/features/start/StartView.tsx" "CHECKLIST_ITEMS.*length.*9"
check_feature "Day 0: Six sections" "src/features/start/StartView.tsx" "Learning to learn"
check_feature "Day 2: Pause nudge" "src/features/today/TodayView.tsx" "days since last activity"
check_feature "Typed restart confirmation" "src/features/start/StartView.tsx" "restartInput.*toLowerCase.*restart"

echo ""
echo "Phase E: Generation Features"
check_feature "Wake lock implementation" "src/features/plan/GenerateWeekPanel.tsx" "navigator.wakeLock.request"
check_feature "Interrupted generation recovery" "src/services/generateWeek.ts" "interrupted generation marker"
check_feature "Prepare next week on Day 5" "src/features/today/TodayView.tsx" "slot === 5.*Prepare next week"
check_feature "Show what will be sent preview" "src/features/plan/GenerateWeekPanel.tsx" "preview.*generation context"

echo ""
echo "Phase E3: Validation Layers"
check_feature "Shape validation (7 days)" "src/engine/generation.ts" "days.length !== 7"
check_feature "Content validation (250-500 words)" "src/content/style.ts" "SUMMARY_MIN_WORDS.*250"
check_feature "Fidelity validation (project/checkpoint)" "src/engine/generation.ts" "fidelityCheck"
check_feature "Readability validator (avg sentence)" "src/content/style.ts" "READABILITY_AVG_SENTENCE_WORDS.*18"
check_feature "Readability validator (glossary terms)" "src/content/style.ts" "READABILITY_MAX_UNFAMILIAR_TERMS.*3"

echo ""
echo "Phase B4: Storage Guard"
check_feature "3MB storage guard" "src/services/storage.ts" "3.*1024.*1024"
check_feature "Storage status note" "src/components/layout/SettingsSheet.tsx" "localStorage mirror disabled"

echo ""
echo "Phase F1: Syllabus Features"
check_feature "Syllabus state chips" "src/features/plan/PlanView.tsx" "Authored.*Generated.*Outline"
check_feature "Syllabus left rail" "src/features/plan/PlanView.tsx" "currentWeek.*border-accent"

echo ""
echo "Phase G1: OSS Pathway"
check_feature "OSS pathway milestones" "src/features/vault/VaultView.tsx" "docs PR.*Week 6"
check_feature "OSS pathway concrete targets" "src/features/vault/VaultView.tsx" "flutter/flutter.*riverpod.*freezed"

echo ""
echo "Phase G2: Delete Polish"
check_feature "Undo toast on delete" "src/features/curriculum/WeekSheet.tsx" "toast.*Undo.*8000"

echo ""
echo "Phase F2: Gamification"
check_feature "XP system" "src/engine/gamification.ts" "XP.*task.*10"
check_feature "Level thresholds" "src/engine/gamification.ts" "LEVELS.*readonly"
check_feature "Quest system" "src/engine/gamification.ts" "interface Quest"
check_feature "Boss fights" "src/engine/gamification.ts" "interface Boss"
check_feature "Gamification UI" "src/features/progress/ProgressView.tsx" "gameStatsFor"

echo ""
echo "=== VERIFICATION SUMMARY ==="
echo "Passed: $PASS"
echo "Failed: $FAIL"
echo ""

if [ $FAIL -eq 0 ]; then
    echo "✅ ALL REQUIREMENTS VERIFIED!"
    exit 0
else
    echo "⚠️  Some requirements need attention"
    exit 1
fi
