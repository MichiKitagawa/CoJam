import { validate, ValidationError } from 'class-validator';
import { plainToClass } from 'class-transformer';

export async function validateRequest<T extends object>(
  dtoClass: new () => T,
  requestBody: any
): Promise<string[]> {
  const dto = plainToClass(dtoClass, requestBody);
  const errors = await validate(dto);
  
  if (errors.length > 0) {
    return flattenValidationErrors(errors);
  }
  
  return [];
}

function flattenValidationErrors(errors: ValidationError[]): string[] {
  return errors.reduce((acc: string[], error: ValidationError) => {
    if (error.constraints) {
      acc.push(...Object.values(error.constraints));
    }
    if (error.children && error.children.length > 0) {
      acc.push(...flattenValidationErrors(error.children));
    }
    return acc;
  }, []);
} 