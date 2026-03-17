import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { packingTemplates } from '@/lib/packing-templates';

/**
 * POST /api/trips/[id]/checklists/from-template
 * Tworzy checklist z szablonu
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: tripId } = params;
    const body = await request.json();
    const { templateId } = body;

    // Znajdź template
    const template = packingTemplates.find(t => t.id === templateId);
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Utwórz checklist
    const checklist = await prisma.tripChecklist.create({
      data: {
        tripId,
        name: template.name,
        items: {
          create: template.items.map(item => ({
            name: item.name,
            category: item.category,
            isPacked: false,
          })),
        },
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json(checklist);
  } catch (error) {
    console.error('Error creating checklist from template:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
