import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';

@Injectable()
export class TenantsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Retrieves all courses for the specified tenant within an isolated RLS transaction.
   */
  async getCourses(tenantId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      return tx.course.findMany({
        orderBy: { createdAt: 'desc' },
      });
    });
  }

  /**
   * Retrieves a specific course by ID within the tenant RLS boundary.
   * If the course belongs to another tenant, PostgreSQL RLS ensures findFirst/findUnique returns null.
   */
  async getCourseById(tenantId: string, courseId: string) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      const course = await tx.course.findFirst({
        where: { id: courseId },
      });
      if (!course) {
        throw new NotFoundException('Course not found in active workspace');
      }
      return course;
    });
  }

  /**
   * Creates a course within the tenant context.
   */
  async createCourse(
    tenantId: string,
    teacherId: string,
    data: { title: string; description?: string; subject?: string },
  ) {
    return this.prisma.withTenant(tenantId, async (tx) => {
      return tx.course.create({
        data: {
          tenantId,
          teacherId,
          title: data.title,
          description: data.description,
          subject: data.subject,
        },
      });
    });
  }
}
