import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || 'all';
    const format = searchParams.get('format') || 'json';

    let data: any = {};

    // Recipes
    if (type === 'recipes' || type === 'all') {
      data.recipes = await prisma.recipe.findMany({
        where: { createdById: session.user.id },
        include: {
          ingredients: true,
          steps: true,
        },
      });
    }

    // Tasks
    if (type === 'tasks' || type === 'all') {
      data.tasks = await prisma.task.findMany({
        where: {
          assigneeId: session.user.id,
        },
        include: {
          completions: true,
        },
      });
    }

    // Events
    if (type === 'events' || type === 'all') {
      data.events = await prisma.event.findMany({
        where: { userId: session.user.id },
      });
    }

    // Full export (GDPR)
    if (type === 'all') {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        include: {
          settings: true,
          badges: true,
          notifications: true,
        },
      });
      data.user = user;
    }

    // Convert to CSV if requested
    if (format === 'csv') {
      // Simplified CSV for single type exports
      let csv = '';

      if (type === 'recipes' && data.recipes) {
        csv = 'ID,Name,Category,Difficulty,PrepTime,CookTime,Servings\n';
        data.recipes.forEach((recipe: any) => {
          csv += `${recipe.id},"${recipe.name}","${recipe.category}","${recipe.difficulty}",${recipe.prepTime},${recipe.cookTime},${recipe.servings}\n`;
        });
      } else if (type === 'tasks' && data.tasks) {
        csv = 'ID,Title,Status,DueDate,Priority\n';
        data.tasks.forEach((task: any) => {
          csv += `${task.id},"${task.title}","${task.status}","${task.dueDate}","${task.priority}"\n`;
        });
      } else if (type === 'events' && data.events) {
        csv = 'ID,Title,StartDate,EndDate,AllDay\n';
        data.events.forEach((event: any) => {
          csv += `${event.id},"${event.title}","${event.startDate}","${event.endDate}",${event.allDay}\n`;
        });
      }

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="planner-${type}-export.csv"`,
        },
      });
    }

    // JSON export
    const json = JSON.stringify(data, null, 2);
    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="planner-${type}-export.json"`,
      },
    });
  } catch (error) {
    console.error('Error exporting data:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

