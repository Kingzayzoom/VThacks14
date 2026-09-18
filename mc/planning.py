"""Turning a sentence into a plan the Commander can actually run.

A model is good at reading "launch an online presence for a food truck" and working out what
that involves. It is not trustworthy about the shape of what it hands back: valid JSON that
matches a schema can still describe a task depending on itself, three tasks with the same id,
or a capability nobody in the world offers. So everything a model proposes comes through here
first, and anything that does not survive is rejected with reasons specific enough to hand
back to the model for one more try.

What we deliberately do *not* let a plan invent is the capability vocabulary. Which agent does
a job is discovered at runtime and can be anyone on the internet; what kinds of job exist is
ours, because the Commander has to know how to wire one task's output into the next one's
input. A mission needing something outside that vocabulary is a plan we record as unsupported
and say so, rather than one we pretend to run.
"""
from dataclasses import dataclass, field

MAX_TASKS = 6


@dataclass
class Task:
    id: str
    title: str
    capability: str
    brief: str = ""
    depends_on: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {"id": self.id, "title": self.title, "capability": self.capability,
                "brief": self.brief, "depends_on": list(self.depends_on)}


@dataclass
class Plan:
    business: dict
    tasks: list[Task]              # already in an order that satisfies every dependency
    unsupported: list[str] = field(default_factory=list)

    def as_dict(self) -> dict:
        return {"business": self.business, "tasks": [t.as_dict() for t in self.tasks],
                "unsupported": list(self.unsupported)}


def order_tasks(tasks: list[Task]) -> tuple[list[Task], str | None]:
    """Dependency order, or a complaint naming the tasks stuck in a cycle.

    Ties are broken by the order the planner listed things, so the same plan always runs the
    same way — a demo that reorders itself between rehearsals is its own kind of bug.
    """
    remaining = {t.id: t for t in tasks}
    done: set[str] = set()
    ordered: list[Task] = []
    while remaining:
        ready = [t for t in tasks
                 if t.id in remaining and all(d in done for d in t.depends_on)]
        if not ready:
            return [], f"these tasks depend on each other in a loop: {', '.join(sorted(remaining))}"
        for t in ready:
            ordered.append(t)
            done.add(t.id)
            del remaining[t.id]
    return ordered, None


def validate_plan(raw: dict, *, known_capabilities: list[str],
                  max_tasks: int = MAX_TASKS) -> tuple[Plan | None, list[str]]:
    """Returns (plan, problems). A plan comes back only when there are no problems.

    Problems are phrased so they can be read straight back to the model: "task 3 has no
    capability" is actionable, "invalid plan" is not.
    """
    problems: list[str] = []
    if not isinstance(raw, dict):
        return None, ["the plan is not an object"]

    raw_tasks = raw.get("tasks") or raw.get("jobs")
    if not isinstance(raw_tasks, list) or not raw_tasks:
        return None, ["the plan has no tasks"]
    if len(raw_tasks) > max_tasks:
        problems.append(f"{len(raw_tasks)} tasks is more than the {max_tasks} we allow")
        raw_tasks = raw_tasks[:max_tasks]

    tasks: list[Task] = []
    unsupported: list[str] = []
    seen_ids: set[str] = set()

    for i, item in enumerate(raw_tasks, start=1):
        if not isinstance(item, dict):
            problems.append(f"task {i} is not an object")
            continue
        capability = (item.get("capability") or "").strip()
        if not capability:
            problems.append(f"task {i} has no capability")
            continue
        if capability not in known_capabilities:
            # Not a malformed plan — a plan for work we cannot source. Recorded, not run.
            unsupported.append(capability)
            continue
        task_id = str(item.get("id") or f"t{i}").strip()
        if task_id in seen_ids:
            problems.append(f"two tasks share the id {task_id!r}")
            continue
        seen_ids.add(task_id)
        depends = item.get("depends_on") or item.get("dependencies") or []
        if not isinstance(depends, list):
            problems.append(f"task {task_id!r} has a depends_on that is not a list")
            depends = []
        tasks.append(Task(
            id=task_id,
            title=str(item.get("title") or capability.replace(".", " ").title())[:60],
            capability=capability,
            brief=str(item.get("brief") or ""),
            depends_on=[str(d) for d in depends],
        ))

    if not tasks:
        asked = ", ".join(sorted(set(unsupported))) or "nothing recognisable"
        problems.append(f"we cannot source any of the capabilities this plan asks for ({asked}); "
                        f"we can do: {', '.join(known_capabilities)}")
        return None, problems

    for task in tasks:
        for dep in list(task.depends_on):
            if dep == task.id:
                problems.append(f"task {task.id!r} depends on itself")
                task.depends_on.remove(dep)
            elif dep not in seen_ids:
                problems.append(f"task {task.id!r} depends on {dep!r}, which is not in the plan")
                task.depends_on.remove(dep)

    ordered, cycle = order_tasks(tasks)
    if cycle:
        problems.append(cycle)
    if problems:
        return None, problems

    business = raw.get("business")
    return Plan(business=business if isinstance(business, dict) else {},
                tasks=ordered, unsupported=sorted(set(unsupported))), []
