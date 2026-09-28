"""
AdverSim Honeypot Sequence Consistency Checker Module
Filters fake honeypot poisoning sequences by evaluating:
1. Kill chain stage progression plausibility
2. Historical transition pattern matching rate (>= 30%)
3. Normal sequence length bounds
"""

from typing import List, Dict, Any, Tuple, Union

try:
    from simulation.mitre_map import MITRE_TECHNIQUES, KILL_CHAIN_STAGES, get_stage
except ImportError:
    try:
        from ..mitre_map import MITRE_TECHNIQUES, KILL_CHAIN_STAGES, get_stage
    except ImportError:
        KILL_CHAIN_STAGES = [
            "Reconnaissance", "Initial Access", "Execution",
            "Persistence", "Defense Evasion", "Lateral Movement", "Exfiltration"
        ]
        MITRE_TECHNIQUES = {}
        def get_stage(tech: str) -> str:
            return "Execution"


STAGE_ORDER = {stage: idx for idx, stage in enumerate(KILL_CHAIN_STAGES)}


class ConsistencyChecker:
    """
    Validates captured attacker sequences against known kill-chain rules and historical patterns.
    Rejects artificial random sequences generated for honeypot poisoning.
    """

    def __init__(self, min_length: int = 1, max_length: int = 25, transition_match_threshold: float = 0.30):
        self.min_length = min_length
        self.max_length = max_length
        self.transition_match_threshold = transition_match_threshold
        self.history: List[List[str]] = []
        self.known_transitions: set = set()

        # Seed initial baseline transitions from standard kill chain logic
        self._seed_baseline_transitions()

    def _seed_baseline_transitions(self) -> None:
        """Seeds common logical transitions between stages."""
        baseline_pairs = [
            ("network_scanning", "service_enumeration"),
            ("service_enumeration", "os_fingerprinting"),
            ("os_fingerprinting", "credential_access"),
            ("credential_access", "script_execution"),
            ("script_execution", "scheduled_task"),
            ("script_execution", "process_injection"),
            ("scheduled_task", "registry_persistence"),
            ("registry_persistence", "account_creation"),
            ("account_creation", "log_clearing"),
            ("log_clearing", "lateral_movement"),
            ("lateral_movement", "pass_the_hash"),
            ("pass_the_hash", "data_compression"),
            ("data_compression", "outbound_transfer"),
            ("outbound_transfer", "encrypted_channel"),
        ]
        for pair in baseline_pairs:
            self.known_transitions.add(pair)

    def _extract_tech_sequence(self, sequence: List[Union[str, Dict[str, Any]]]) -> List[str]:
        """Extracts technique names from a list of strings or event dictionaries."""
        tech_seq = []
        for item in sequence:
            if isinstance(item, dict):
                tech_seq.append(item.get("technique", "network_scanning"))
            else:
                tech_seq.append(str(item))
        return tech_seq

    def update_history(self, sequence: List[Union[str, Dict[str, Any]]]) -> None:
        """Adds a validated sequence and its transitions to historical baseline."""
        tech_seq = self._extract_tech_sequence(sequence)
        if tech_seq not in self.history:
            self.history.append(tech_seq)
            for i in range(len(tech_seq) - 1):
                self.known_transitions.add((tech_seq[i], tech_seq[i + 1]))

    def check(self, sequence: List[Union[str, Dict[str, Any]]]) -> Tuple[bool, str]:
        """
        Validates sequence according to 3 strict consistency criteria:
        1. Sequence length within bounds
        2. Plausible kill chain stage order
        3. Match rate with known historical transition patterns >= 30%
        Prints acceptance or rejection reason.
        """
        tech_seq = self._extract_tech_sequence(sequence)
        seq_len = len(tech_seq)

        # Criterion 1: Sequence Length Bounds
        if seq_len < self.min_length or seq_len > self.max_length:
            reason = f"REJECTED: Sequence length ({seq_len}) outside valid bounds [{self.min_length}, {self.max_length}]"
            print(f"[CONSISTENCY CHECKER] {reason}")
            return False, reason

        # Criterion 2: Plausible Kill Chain Order
        stages = [get_stage(t) for t in tech_seq]
        stage_indices = [STAGE_ORDER.get(s, 2) for s in stages]

        # Allow at most 1 backward jump of 1 stage max (e.g. pivoting back to Recon once)
        backwards_jumps = 0
        for i in range(len(stage_indices) - 1):
            diff = stage_indices[i + 1] - stage_indices[i]
            if diff < -2:  # Extreme regression (e.g. Exfiltration -> Recon)
                reason = f"REJECTED: Implausible kill chain stage regression ({stages[i]} -> {stages[i+1]})"
                print(f"[CONSISTENCY CHECKER] {reason}")
                return False, reason
            elif diff < 0:
                backwards_jumps += 1

        if backwards_jumps > 2:
            reason = f"REJECTED: Excessive out-of-order stage jumps ({backwards_jumps} regressions)"
            print(f"[CONSISTENCY CHECKER] {reason}")
            return False, reason

        # Criterion 3: Historical Transition Pattern Match Rate (>= 30%)
        if seq_len > 1:
            transitions = [(tech_seq[i], tech_seq[i + 1]) for i in range(seq_len - 1)]
            matched = sum(1 for tr in transitions if tr in self.known_transitions)
            match_rate = matched / len(transitions)

            if match_rate < self.transition_match_threshold:
                reason = f"REJECTED: Low transition pattern match rate ({match_rate:.1%} < {self.transition_match_threshold:.0%})"
                print(f"[CONSISTENCY CHECKER] {reason}")
                return False, reason

        # All criteria passed
        reason = f"ACCEPTED: Valid kill chain sequence (Length: {seq_len}, Stages: {' -> '.join(set(stages))})"
        print(f"[CONSISTENCY CHECKER] {reason}")
        self.update_history(sequence)
        return True, reason

    def validate_sequence(self, sequence: List[Union[str, Dict[str, Any]]]) -> Tuple[bool, str]:
        """Alias for check() method."""
        return self.check(sequence)


if __name__ == "__main__":
    print("[TEST] Testing ConsistencyChecker...")
    checker = ConsistencyChecker()

    valid_seq = [
        {"technique": "network_scanning"},
        {"technique": "service_enumeration"},
        {"technique": "credential_access"},
        {"technique": "script_execution"},
    ]

    invalid_random_poisoning = [
        {"technique": "encrypted_channel"},
        {"technique": "network_scanning"},
        {"technique": "log_clearing"},
        {"technique": "os_fingerprinting"},
    ]

    print("\nCheck 1 (Valid sequence):")
    checker.check(valid_seq)

    print("\nCheck 2 (Random fake poisoning sequence):")
    checker.check(invalid_random_poisoning)
